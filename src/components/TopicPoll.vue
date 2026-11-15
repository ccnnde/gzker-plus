<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useResizeObserver } from '@vueuse/core';
import { ElMessageBox } from 'element-plus';

import { API_TOPIC, API_USER } from '@/api';
import { closeTopicPoll, getTopicPoll, getTopicPollVoters, voteInTopicPoll } from '@/api/topic-poll';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import type { TopicPoll, TopicPollVoter, TopicPollVoterPage } from '@/types';

interface Props {
  pollId: string;
  topicId?: string;
  isTopicRefreshing?: boolean;
}

interface VoterList extends TopicPollVoterPage {
  loading: boolean;
  error: string;
}

const props = defineProps<Props>();
const { t, locale } = useI18n();
const updateScrollbar = inject(UPDATE_SCROLLBAR_INJECTION_KEY);

const card = ref<HTMLElement | null>(null);
const poll = ref<TopicPoll>();
const choices = ref<number[]>([]);
const voterLists = reactive<Partial<Record<number, VoterList>>>({});
const resultsMode = ref(false);
const loading = ref(true);
const submitting = ref(false);
const error = ref('');
const headingId = useId();
const controller = new AbortController();
let expiryTimer: number | undefined;

const busy = computed(() => {
  return loading.value || submitting.value;
});

const canChangeVote = computed(() => {
  const state = poll.value;

  return Boolean(state?.can_vote && (!state.mine.length || state.revote));
});

const showingResults = computed(() => {
  return resultsMode.value && Boolean(poll.value?.show_results);
});

const deadline = computed(() => {
  const closesAt = poll.value?.closes_at;

  if (!closesAt) {
    return '';
  }

  return new Intl.DateTimeFormat(locale.value, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(closesAt * 1000);
});

const loginHref = computed(() => {
  const path = API_TOPIC + (props.topicId || props.pollId);

  return `/login?next=${encodeURIComponent(path)}`;
});

const getErrorMessage = (cause: unknown) => {
  return cause instanceof Error && cause.message ? cause.message : t('enhancedTopic.poll.requestFailed');
};

const setView = (results: boolean) => {
  resultsMode.value = results;
  choices.value = [...(poll.value?.mine ?? [])];
  error.value = '';

  for (const key of Object.keys(voterLists)) {
    delete voterLists[Number(key)];
  }
};

const applyState = (state: TopicPoll) => {
  poll.value = state;
  setView(Boolean(state.mine.length || state.closed));
  window.clearTimeout(expiryTimer);

  if (!state.closed) {
    const delay = Math.min(2_147_483_647, Math.max(1000, (state.closes_at - state.server_now) * 1000 + 1000));
    expiryTimer = window.setTimeout(loadPoll, delay);
  }
};

const loadPoll = async () => {
  if (submitting.value || controller.signal.aborted) {
    return;
  }

  loading.value = true;
  error.value = '';
  window.clearTimeout(expiryTimer);

  try {
    const state = await getTopicPoll(props.pollId, controller.signal);

    if (!controller.signal.aborted) {
      applyState(state);
    }
  } catch (cause) {
    if (!controller.signal.aborted) {
      poll.value = undefined;
      error.value = getErrorMessage(cause);
    }
  } finally {
    loading.value = false;
  }
};

const updateChoice = (event: Event, position: number) => {
  const input = event.target as HTMLInputElement;
  const limit = poll.value?.max_choices ?? 1;

  if (limit === 1) {
    choices.value = [position];
  } else if (!input.checked) {
    choices.value = choices.value.filter((choice) => {
      return choice !== position;
    });
  } else if (choices.value.length < limit) {
    choices.value = [...choices.value, position];
  } else {
    input.checked = false;
    error.value = t('enhancedTopic.poll.selectionLimit', { count: limit });
    return;
  }

  error.value = '';
};

const updatePoll = async (request: () => Promise<TopicPoll>, isApplied: (state: TopicPoll) => boolean) => {
  submitting.value = true;
  error.value = '';
  window.clearTimeout(expiryTimer);

  try {
    const state = await request();

    if (!controller.signal.aborted) {
      applyState(state);
    }
  } catch (cause) {
    if (controller.signal.aborted) {
      return;
    }

    // A failed response can arrive after the server has already applied the change.
    try {
      const state = await getTopicPoll(props.pollId, controller.signal);

      if (!controller.signal.aborted) {
        applyState(state);

        if (!isApplied(state)) {
          error.value = getErrorMessage(cause);
        }
      }
    } catch {
      if (!controller.signal.aborted) {
        poll.value = undefined;
        error.value = t('enhancedTopic.poll.updateUnconfirmed');
      }
    }
  } finally {
    submitting.value = false;
  }
};

const submitVote = async (withdraw: boolean) => {
  const state = poll.value;

  if (!state || !canChangeVote.value || busy.value || (withdraw && !state.mine.length)) {
    return;
  }

  const selected = withdraw ? [] : [...choices.value];

  if (!withdraw && selected.length === 0) {
    error.value = t('enhancedTopic.poll.selectOption');
    return;
  }

  const vote = {
    choices: selected,
    revision: state.revision,
  };

  await updatePoll(
    () => {
      return voteInTopicPoll(props.pollId, vote, controller.signal);
    },
    (updated) => {
      const sameChoices = selected.every((choice) => {
        return updated.mine.includes(choice);
      });

      return updated.mine.length === selected.length && sameChoices;
    },
  );
};

const endPoll = async () => {
  if (!poll.value?.can_close || busy.value) {
    return;
  }

  try {
    await ElMessageBox.confirm(t('enhancedTopic.poll.confirmClose'), t('enhancedTopic.poll.close'), {
      type: 'warning',
    });
  } catch {
    return;
  }

  if (controller.signal.aborted || !poll.value?.can_close || busy.value) {
    return;
  }

  await updatePoll(
    () => {
      return closeTopicPoll(props.pollId, controller.signal);
    },
    (state) => {
      return state.closed;
    },
  );
};

const loadVoters = async (position: number) => {
  if (!showingResults.value || !poll.value?.public || busy.value) {
    return;
  }

  const list = (voterLists[position] ??= reactive<VoterList>({
    items: [],
    next: 0,
    loading: false,
    error: '',
  }));

  if (list.loading || list.next === null) {
    return;
  }

  list.loading = true;
  list.error = '';

  const query = {
    option: position,
    after: list.next,
  };

  try {
    const page = await getTopicPollVoters(props.pollId, query, controller.signal);
    list.items.push(...page.items);
    list.next = page.next || null;
  } catch (cause) {
    if (!controller.signal.aborted) {
      list.error = getErrorMessage(cause);
    }
  } finally {
    list.loading = false;
  }
};

const getResultWidth = (percent: number | null | undefined) => {
  return `${Math.max(0, Math.min(100, percent ?? 0))}%`;
};

const getVoterAvatar = ({ uid, avatar }: TopicPollVoter) => {
  const filename = encodeURIComponent(avatar || 'default.png');

  return `/static/avatar/${uid % 100}/m_${filename}`;
};

watch(
  () => {
    return props.isTopicRefreshing;
  },
  (refreshing, wasRefreshing) => {
    if (wasRefreshing && !refreshing && !busy.value) {
      loadPoll();
    }
  },
);

useResizeObserver(card, () => {
  updateScrollbar?.();
});

onMounted(loadPoll);
onBeforeUnmount(() => {
  window.clearTimeout(expiryTimer);
  controller.abort();
});
</script>

<template>
  <section ref="card" class="topic-poll" :aria-labelledby="headingId" :aria-busy="busy">
    <h3 :id="headingId" class="topic-poll-title">{{ poll?.question ?? $t('enhancedTopic.poll.label') }}</h3>
    <template v-if="poll">
      <p class="topic-poll-meta topic-poll-meta-line">
        <span>{{
          poll.max_choices === 1
            ? $t('enhancedTopic.poll.singleChoice')
            : $t('enhancedTopic.poll.multipleChoices', { count: poll.max_choices })
        }}</span>
        <span class="topic-poll-meta-dot" aria-hidden="true"></span>
        <span>{{ $t(poll.public ? 'enhancedTopic.poll.public' : 'enhancedTopic.poll.anonymous') }}</span>
      </p>
      <p class="topic-poll-meta topic-poll-meta-line">
        <span>{{ $t('enhancedTopic.poll.participants', { count: poll.voters }) }}</span>
        <span class="topic-poll-meta-dot" aria-hidden="true"></span>
        <span>{{
          poll.closed ? $t('enhancedTopic.poll.closed') : $t('enhancedTopic.poll.deadline', { time: deadline })
        }}</span>
      </p>
      <ul v-if="showingResults" class="topic-poll-list">
        <li v-for="option in poll.options" :key="option.position" class="topic-poll-result-item">
          <div :class="['topic-poll-result', { 'topic-poll-result-selected': poll.mine.includes(option.position) }]">
            <span class="topic-poll-bar" :style="{ width: getResultWidth(option.percent) }" aria-hidden="true"></span>
            <div class="topic-poll-result-line">
              <span class="topic-poll-result-label">
                <span>{{ option.label }}</span>
                <un-i-mdi-check
                  v-if="poll.mine.includes(option.position)"
                  class="topic-poll-mine"
                  role="img"
                  :aria-label="$t('enhancedTopic.poll.myChoice')"
                />
              </span>
              <span class="topic-poll-tally">{{
                $t('enhancedTopic.poll.tally', { count: option.votes, percent: option.percent })
              }}</span>
            </div>
          </div>
          <template v-if="poll.public && option.votes">
            <ul v-if="voterLists[option.position]?.items.length" class="topic-poll-voters">
              <li v-for="voter in voterLists[option.position]?.items" :key="voter.uid">
                <a
                  class="topic-poll-voter"
                  :href="API_USER + encodeURIComponent(voter.username)"
                  :title="`${voter.nickname || voter.username} · @${voter.username}`"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img :src="getVoterAvatar(voter)" width="24" height="24" alt="" loading="lazy" />
                </a>
              </li>
            </ul>
            <p v-if="voterLists[option.position]?.next === null" class="topic-poll-voters-status" role="status">
              {{ $t('enhancedTopic.poll.votersShown', { count: voterLists[option.position]?.items.length }) }}
            </p>
            <ElButton
              v-else
              class="topic-poll-voters-button"
              link
              type="primary"
              :disabled="busy"
              :loading="voterLists[option.position]?.loading"
              @click="loadVoters(option.position)"
            >
              {{
                $t(
                  voterLists[option.position]?.items.length
                    ? 'enhancedTopic.poll.loadMoreVoters'
                    : 'enhancedTopic.poll.viewVoters',
                )
              }}
            </ElButton>
            <p v-if="voterLists[option.position]?.error" class="topic-poll-error" role="alert">
              {{ voterLists[option.position]?.error }}
            </p>
          </template>
        </li>
      </ul>
      <fieldset v-else class="topic-poll-list" :aria-labelledby="headingId" :disabled="busy || !canChangeVote">
        <label v-for="option in poll.options" :key="option.position" class="topic-poll-choice">
          <input
            :type="poll.max_choices === 1 ? 'radio' : 'checkbox'"
            :name="headingId"
            :checked="choices.includes(option.position)"
            @change="updateChoice($event, option.position)"
          />
          <span>{{ option.label }}</span>
        </label>
      </fieldset>
      <p v-if="showingResults && poll.max_choices > 1" class="topic-poll-meta">
        {{ $t('enhancedTopic.poll.percentageNote') }}
      </p>
      <p v-if="!poll.show_results" class="topic-poll-meta">
        {{
          $t(
            poll.results === 'after_close'
              ? 'enhancedTopic.poll.resultsAfterClose'
              : 'enhancedTopic.poll.resultsAfterVote',
          )
        }}
      </p>
      <p v-if="!poll.revote && !poll.closed" class="topic-poll-meta">{{ $t('enhancedTopic.poll.finalVote') }}</p>
      <p v-if="poll.read_only" class="topic-poll-meta">{{ $t('enhancedTopic.poll.readOnly') }}</p>
      <div class="topic-poll-actions">
        <a v-if="!poll.logged_in && !poll.closed" class="topic-poll-login" :href="loginHref">{{
          $t('enhancedTopic.poll.login')
        }}</a>
        <ElButton v-if="canChangeVote && !showingResults" type="primary" :disabled="busy" @click="submitVote(false)">
          {{ $t(poll.mine.length ? 'enhancedTopic.poll.saveVote' : 'enhancedTopic.poll.vote') }}
        </ElButton>
        <ElButton v-if="canChangeVote && showingResults" :disabled="busy" @click="setView(false)">
          {{ $t(poll.mine.length ? 'enhancedTopic.poll.changeVote' : 'enhancedTopic.poll.participate') }}
        </ElButton>
        <ElButton v-if="poll.show_results && !showingResults" :disabled="busy" @click="setView(true)">
          {{ $t('enhancedTopic.poll.viewResults') }}
        </ElButton>
        <ElButton v-if="canChangeVote && poll.mine.length" :disabled="busy" @click="submitVote(true)">
          {{ $t('enhancedTopic.poll.withdraw') }}
        </ElButton>
        <ElButton v-if="poll.can_close" :disabled="busy" @click="endPoll">{{
          $t('enhancedTopic.poll.close')
        }}</ElButton>
      </div>
    </template>
    <p v-else-if="loading" class="topic-poll-meta" role="status">{{ $t('enhancedTopic.poll.loading') }}</p>
    <p v-if="error" class="topic-poll-error" role="alert">{{ error }}</p>
    <ElButton v-if="!poll && !busy" size="small" @click="loadPoll">{{ $t('enhancedTopic.poll.reload') }}</ElButton>
  </section>
</template>

<style lang="scss" scoped>
.topic-poll {
  --topic-poll-padding-block: 14px;

  padding: var(--topic-poll-padding-block) 16px;
  margin-top: 16px;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
}

.topic-poll-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.topic-poll-meta,
.topic-poll-error {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.topic-poll-meta-line {
  display: flex;
  gap: 6px;
  align-items: flex-start;
  line-height: 1.3;
}

.topic-poll-meta-dot {
  flex: none;
  width: 3px;
  height: 3px;
  margin-top: calc((1lh - 3px) / 2);
  background-color: currentcolor;
  border-radius: 50%;
}

.topic-poll-error {
  margin-bottom: 8px;
  color: var(--el-color-danger);
}

.topic-poll-list,
.topic-poll-result-item {
  display: grid;
  gap: 12px;
}

.topic-poll-list {
  min-width: 0;
  padding: 0;
  margin: 12px 0 0;
  list-style: none;
  border: 0;
}

.topic-poll-list + .topic-poll-meta {
  margin-top: 12px;
}

.topic-poll-choice,
.topic-poll-result {
  padding: 10px 12px;
  overflow-wrap: anywhere;
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
}

.topic-poll-choice {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 0;
  font-weight: normal;
  line-height: 1.5;
}

.topic-poll-choice input {
  --topic-poll-control-size: 14px;

  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--topic-poll-control-size);
  height: var(--topic-poll-control-size);
  margin: calc((1lh - var(--topic-poll-control-size)) / 2) 0 0;
  font: inherit;
  appearance: none;
  cursor: inherit;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-small);

  &[type='radio'] {
    border-radius: 50%;
  }

  &:checked {
    background-color: var(--el-color-primary);
    border-color: var(--el-color-primary);

    &::after {
      content: '';
    }
  }

  &[type='checkbox']::after {
    width: 4px;
    height: 7px;
    border: solid var(--el-color-white);
    border-width: 0 1px 1px 0;
    transform: translateY(-1px) rotate(45deg);
  }

  &[type='radio']::after {
    width: 4px;
    height: 4px;
    background-color: var(--el-color-white);
    border-radius: 50%;
  }

  &:focus {
    outline: none;
    box-shadow: none;
  }

  &:disabled {
    background-color: var(--el-fill-color-light);
    border-color: var(--el-border-color);

    &::after {
      border-color: var(--el-text-color-disabled);
    }

    &[type='radio']::after {
      background-color: var(--el-text-color-disabled);
    }
  }

  @media (forced-colors: active) {
    appearance: auto;

    &:checked::after {
      content: none;
    }
  }
}

.topic-poll-list:not(:disabled) .topic-poll-choice {
  cursor: pointer;

  &:hover {
    background-color: var(--el-fill-color-light);

    input:not(:checked) {
      border-color: var(--el-color-primary);
    }
  }

  &:has(input:focus-visible) {
    background-color: var(--el-fill-color-light);
    border-color: var(--el-color-primary);
  }
}

.topic-poll-result-item {
  justify-items: start;
}

.topic-poll-result {
  position: relative;
  justify-self: stretch;
  overflow: hidden;
  background: var(--el-fill-color-light);
}

.topic-poll-result-selected {
  border-color: var(--el-color-primary);
}

.topic-poll-bar {
  position: absolute;
  inset: 0 auto 0 0;
  background: color-mix(in srgb, var(--el-color-primary) 22%, transparent);
}

.topic-poll-result-line {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  justify-content: space-between;
}

.topic-poll-result-label {
  display: inline-flex;
  gap: 4px;
  align-items: flex-start;
  line-height: 1.5;
}

.topic-poll-tally {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.topic-poll-mine {
  flex: none;
  width: 1.5em;
  height: 1.5em;
  color: var(--el-color-primary);
}

.topic-poll-voters,
.topic-poll-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.topic-poll-voters {
  padding: 0;
  margin: 0;
  list-style: none;
}

.topic-poll-voter {
  display: inline-flex;
}

.topic-poll-voter img {
  object-fit: cover;
  border-radius: 50%;
}

.topic-poll-voters-button,
.topic-poll-voters-status,
.topic-poll-result-item > .topic-poll-error {
  margin: 0;
}

.topic-poll-voters-status {
  color: var(--el-text-color-regular);
}

.topic-poll-voters-button.el-button.is-link {
  padding: 0;
  border: 0;
}

.topic-poll-actions:not(:empty) {
  margin-top: 12px;
}

.topic-poll-actions:not(:empty) + .topic-poll-error {
  margin: var(--topic-poll-padding-block) 0 0;
}

.topic-poll-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.topic-poll-login {
  color: var(--el-color-primary);
}
</style>
