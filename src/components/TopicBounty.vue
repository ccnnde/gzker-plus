<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';

import { disputeTopicBounty } from '@/api';
import { getTopicUrl } from '@/utils';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import type { TopicBounty } from '@/types';

interface Props {
  bounty: TopicBounty;
  topicId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  focusReply: [replyId: string];
}>();
const { t } = useI18n();
const disputeReason = ref('');
const submittingDispute = ref(false);

const acceptedReplyHref = computed(() => {
  const replyId = props.bounty.acceptedReplyId;

  if (!replyId || !props.topicId) {
    return undefined;
  }

  return `${getTopicUrl(props.topicId)}#r${replyId}`;
});

const focusAcceptedReply = (event: MouseEvent) => {
  const replyId = props.bounty.acceptedReplyId;

  if (!replyId || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return;
  }

  event.preventDefault();
  emit('focusReply', replyId);
};

const submitDispute = async () => {
  const action = props.bounty.disputeAction;
  const reason = disputeReason.value.trim();

  if (!action || !reason || submittingDispute.value) {
    return;
  }

  submittingDispute.value = true;

  try {
    await disputeTopicBounty(action, reason);
    ElMessage.success(t('enhancedTopic.bounty.reviewSubmitted'));
  } catch {
    ElMessage.error(t('enhancedTopic.bounty.reviewFailed'));
  } finally {
    submittingDispute.value = false;
  }
};

const isBountyAccepted = computed(() => {
  return props.bounty.status === '已采纳';
});

const statusLabel = computed(() => {
  if (isBountyAccepted.value) {
    return t('enhancedTopic.bounty.accepted');
  }

  return props.bounty.status === '进行中' ? t('enhancedTopic.bounty.active') : props.bounty.status;
});

const updateScrollbar = inject(UPDATE_SCROLLBAR_INJECTION_KEY);
</script>

<template>
  <section class="topic-bounty" :aria-label="$t('enhancedTopic.bounty.label')">
    <div class="topic-bounty-header">
      <div class="topic-bounty-info">
        <div class="topic-bounty-summary">
          <span class="topic-bounty-reward">
            <span class="topic-bounty-icon i-gzkp-point" aria-hidden="true"></span>
            <span class="topic-bounty-points">
              {{ $t('enhancedTopic.bounty.label') }}
              <strong>{{ bounty.amount }}</strong>
              {{ $t('enhancedTopic.bounty.points') }}
            </span>
          </span>
          <span
            v-if="statusLabel"
            :class="['topic-bounty-status', { 'topic-bounty-status-accepted': isBountyAccepted }]"
          >
            {{ statusLabel }}
          </span>
        </div>
        <a
          v-if="acceptedReplyHref"
          class="topic-bounty-reply-link"
          :href="acceptedReplyHref"
          @click="focusAcceptedReply"
        >
          <span class="topic-bounty-reply-arrow i-gzkp-reply-arrow" aria-hidden="true"></span>
          <span class="topic-bounty-reply-label">
            {{ $t('enhancedTopic.bounty.acceptedReply', { id: bounty.acceptedReplyId }) }}
          </span>
        </a>
      </div>
      <div v-if="bounty.deadline" class="topic-bounty-deadline">
        <un-i-mdi-clock-outline class="topic-bounty-clock" aria-hidden="true" />
        <span>{{ $t('enhancedTopic.bounty.deadline', { time: bounty.deadline }) }}</span>
      </div>
    </div>
    <details v-if="bounty.disputeAction" class="topic-bounty-dispute" @toggle="updateScrollbar?.()">
      <summary class="topic-bounty-toggle">
        {{ $t('enhancedTopic.bounty.requestReview') }}
        <un-i-mdi-chevron-down class="topic-bounty-chevron" aria-hidden="true" />
      </summary>
      <form class="topic-bounty-form" @submit.prevent="submitDispute">
        <ElInput
          v-model="disputeReason"
          class="topic-bounty-reason"
          clearable
          maxlength="1000"
          :placeholder="$t('enhancedTopic.bounty.reason')"
          :aria-label="$t('enhancedTopic.bounty.reason')"
        />
        <ElButton type="warning" native-type="submit" :disabled="!disputeReason.trim()" :loading="submittingDispute">
          {{ $t('enhancedTopic.bounty.submitReview') }}
        </ElButton>
      </form>
    </details>
  </section>
</template>

<style lang="scss" scoped>
.topic-bounty {
  $accent-border-width: 3px;

  --topic-bounty-bg: #fffcf0;
  --topic-bounty-title: #5c3620;
  --topic-bounty-accent: #f59e0b;
  --topic-bounty-amount: #d97706;
  --topic-bounty-link: #92400e;
  --topic-bounty-deadline: #ae856a;
  --topic-bounty-accepted-bg: #d1fae5;
  --topic-bounty-accepted-border: #b8f6d9;
  --topic-bounty-accepted-text: #065f46;
  --topic-bounty-accepted-dot: #10b981;

  padding-block: 14px;
  padding-inline: calc(20px - $accent-border-width) 20px;
  margin-top: 15px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--topic-bounty-link);
  background: var(--topic-bounty-bg);
  border-inline-start: $accent-border-width solid var(--topic-bounty-accent);
}

html.gzkp-dark .topic-bounty {
  --topic-bounty-bg: #2d2519;
  --topic-bounty-title: #f4e0cb;
  --topic-bounty-amount: #fbbf60;
  --topic-bounty-link: #f3bc84;
  --topic-bounty-deadline: #cda88c;
  --topic-bounty-accepted-bg: #15382d;
  --topic-bounty-accepted-border: #286047;
  --topic-bounty-accepted-text: #a7f3d0;
}

html[data-gzkp-theme='light-tokyo-night'] .topic-bounty {
  --topic-bounty-bg: color-mix(in srgb, var(--el-color-primary) 8%, var(--el-bg-color));
  --topic-bounty-title: var(--el-text-color-primary);
  --topic-bounty-accent: var(--el-color-primary);
  --topic-bounty-amount: var(--el-color-primary-dark-2);
  --topic-bounty-link: var(--el-color-primary);
  --topic-bounty-deadline: var(--el-text-color-regular);
  --topic-bounty-clock-color: var(--topic-bounty-deadline);
  --topic-bounty-accepted-bg: var(--el-color-success-light-9);
  --topic-bounty-accepted-border: var(--el-color-success-light-7);
  --topic-bounty-accepted-text: color-mix(in srgb, var(--el-color-success-dark-2) 85%, var(--el-text-color-primary));
  --topic-bounty-accepted-dot: var(--el-color-success);
}

html.gzkp-dark[data-gzkp-theme='dark-soft'] .topic-bounty {
  --topic-bounty-bg: var(--el-bg-color-overlay);
  --topic-bounty-title: var(--el-text-color-primary);
  --topic-bounty-accent: var(--el-color-primary);
  --topic-bounty-amount: var(--el-color-primary);
  --topic-bounty-link: var(--el-color-primary);
  --topic-bounty-deadline: var(--el-text-color-secondary);
  --topic-bounty-clock-color: var(--topic-bounty-deadline);
}

.topic-bounty-header,
.topic-bounty-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  align-items: center;
}

.topic-bounty-header {
  gap: 8px 20px;
  justify-content: space-between;
}

.topic-bounty-reward {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: var(--topic-bounty-title);
}

.topic-bounty-icon {
  flex: none;
  font-size: 20px;
  color: var(--topic-bounty-accent);
}

.topic-bounty-points strong {
  margin-inline: 2px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  color: var(--topic-bounty-amount);
}

.topic-bounty-status {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 2px 9px;
  font-size: 12px;
  font-weight: 600;
  background: color-mix(in srgb, var(--topic-bounty-accent) 12%, var(--topic-bounty-bg));
  border: 1px solid color-mix(in srgb, var(--topic-bounty-accent) 25%, var(--topic-bounty-bg));
  border-radius: 6px;

  &::before {
    width: 7px;
    height: 7px;
    content: '';
    background: var(--topic-bounty-accent);
    border-radius: 50%;
  }
}

.topic-bounty-status-accepted {
  color: var(--topic-bounty-accepted-text);
  background: var(--topic-bounty-accepted-bg);
  border-color: var(--topic-bounty-accepted-border);

  &::before {
    background: var(--topic-bounty-accepted-dot);
  }
}

.topic-bounty-deadline,
.topic-bounty-reply-link {
  display: flex;
  gap: 7px;
  align-items: center;
}

.topic-bounty-deadline {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--topic-bounty-deadline);
}

.topic-bounty-clock,
.topic-bounty-reply-arrow {
  flex: none;
  font-size: 16px;
  color: var(--topic-bounty-accent);
}

.topic-bounty-clock {
  color: var(--topic-bounty-clock-color, var(--topic-bounty-accent));
  transform: translateY(1px);
}

.topic-bounty-reply-arrow {
  transition: transform 180ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}

.topic-bounty-reply-link {
  width: fit-content;
  max-width: calc(100% - 28px);
  margin-block-start: 4px;
  margin-inline-start: 28px;
  color: inherit;
  text-decoration: none;
  overflow-wrap: anywhere;

  &:hover .topic-bounty-reply-arrow {
    transform: translateX(2px);
  }
}

.topic-bounty-reply-label {
  text-decoration: underline 1px color-mix(in srgb, var(--topic-bounty-accent) 55%, var(--topic-bounty-bg));
  text-decoration-skip-ink: none;
  text-underline-offset: 3px;
}

.topic-bounty-dispute {
  margin-top: 7px;

  &[open] .topic-bounty-chevron {
    transform: rotate(180deg);
  }
}

.topic-bounty-toggle {
  display: flex;
  gap: 4px;
  align-items: center;
  width: fit-content;
  min-height: 25px;
  font-size: 12px;
  list-style: none;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid currentcolor;
    outline-offset: 2px;
  }

  &::-webkit-details-marker {
    display: none;
  }
}

.topic-bounty-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.topic-bounty-reason {
  flex: 1 1 200px;
  min-width: 0;
}
</style>
