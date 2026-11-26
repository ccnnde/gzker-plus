<script setup lang="ts">
import { computed, ref } from 'vue';

import { t } from '@/i18n';

import type { TopicPollDraft } from '@/types';

interface Props {
  poll: TopicPollDraft;
}

const props = defineProps<Props>();
const expanded = ref(false);
const previewCount = 3;

const visibleOptions = computed(() => {
  return expanded.value ? props.poll.options : props.poll.options.slice(0, previewCount);
});

const deadline = computed(() => {
  const date = new Date(props.poll.deadline);

  if (!Number.isFinite(date.getTime())) {
    return {
      text: '-',
      expired: false,
    };
  }

  return {
    text: date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    expired: date.getTime() <= Date.now(),
  };
});

const resultLabels = computed(() => {
  return {
    always: t('enhancedTopic.pollEditor.always'),
    after_vote: t('enhancedTopic.poll.resultsAfterVote'),
    after_close: t('enhancedTopic.poll.resultsAfterClose'),
  };
});

const summary = computed(() => {
  return [
    resultLabels.value[props.poll.results] || '-',
    t(props.poll.public ? 'enhancedTopic.pollHistory.public' : 'enhancedTopic.pollHistory.private'),
    t(props.poll.revote ? 'enhancedTopic.pollEditor.revote' : 'enhancedTopic.pollHistory.revoteDisabled'),
  ].join(' · ');
});
</script>

<template>
  <section class="editor-history-poll">
    <div class="editor-history-poll-heading">
      <span class="editor-history-poll-label">{{ $t('enhancedTopic.pollHistory.label') }}</span>
      <span v-if="!poll.enabled" class="editor-history-poll-meta">
        {{ $t('enhancedTopic.pollHistory.notAttached') }}
      </span>
    </div>
    <p class="editor-history-poll-question">{{ poll.question || '-' }}</p>
    <ol class="editor-history-poll-options">
      <li v-for="(option, index) in visibleOptions" :key="index">
        {{ option || $t('enhancedTopic.pollHistory.missingOption', { index: index + 1 }) }}
      </li>
    </ol>
    <ElButton
      v-if="poll.options.length > previewCount"
      class="editor-history-poll-toggle"
      type="primary"
      link
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{
        expanded
          ? $t('enhancedTopic.pollHistory.collapse')
          : $t('enhancedTopic.pollHistory.expandOptions', { count: poll.options.length - previewCount })
      }}
    </ElButton>
    <p class="editor-history-poll-meta">
      {{ $t('enhancedTopic.pollHistory.maxChoices', { count: poll.maxChoices }) }}
      · {{ $t('enhancedTopic.poll.deadline', { time: deadline.text }) }}
      <span v-if="deadline.expired" class="editor-history-poll-expired">
        {{ $t('enhancedTopic.pollHistory.expired') }}
      </span>
    </p>
    <p class="editor-history-poll-meta">{{ summary }}</p>
  </section>
</template>

<style lang="scss" scoped>
.editor-history-poll {
  margin-top: 16px;
  font-size: 14px;
  line-height: 25px;
  overflow-wrap: anywhere;
}

.editor-history-poll-heading {
  display: flex;
  gap: 8px;
  align-items: baseline;
}

.editor-history-poll-label {
  padding-left: 5px;
  color: var(--el-text-color-regular);
  border-left: 3px solid var(--el-color-primary);
  border-radius: var(--el-border-radius-small);
}

.editor-history-poll-question {
  margin: 8px 0 4px;
  white-space: pre-wrap;
}

.editor-history-poll-options {
  padding-left: 24px;
  margin: 0 0 8px;
  white-space: pre-wrap;
  list-style: decimal;
}

.editor-history-poll-toggle {
  margin-bottom: 8px;
}

.editor-history-poll-meta {
  margin: 0;
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-secondary);
}

.editor-history-poll-expired {
  margin-left: 6px;
  color: var(--el-color-warning);
}
</style>
