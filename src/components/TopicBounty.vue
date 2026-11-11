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

const isBountyActive = computed(() => {
  return props.bounty.status === '进行中';
});

const statusLabel = computed(() => {
  return isBountyActive.value ? t('enhancedTopic.bounty.active') : props.bounty.status;
});

const updateScrollbar = inject(UPDATE_SCROLLBAR_INJECTION_KEY);
</script>

<template>
  <section class="topic-bounty" :aria-label="$t('enhancedTopic.bounty.label')">
    <div class="topic-bounty-header">
      <div class="topic-bounty-summary">
        <span class="topic-bounty-reward">
          <span class="topic-bounty-icon i-gzkp-point" aria-hidden="true"></span>
          <span class="topic-bounty-points">
            {{ $t('enhancedTopic.bounty.label') }}
            <strong>{{ bounty.amount }}</strong>
            {{ $t('enhancedTopic.bounty.points') }}
          </span>
        </span>
        <span v-if="statusLabel" class="topic-bounty-status">{{ statusLabel }}</span>
      </div>
      <div v-if="bounty.deadline || acceptedReplyHref" class="topic-bounty-meta">
        <span v-if="bounty.deadline">{{ $t('enhancedTopic.bounty.deadline', { time: bounty.deadline }) }}</span>
        <a
          v-if="acceptedReplyHref"
          class="topic-bounty-reply-link"
          :href="acceptedReplyHref"
          @click="focusAcceptedReply"
        >
          {{ $t('enhancedTopic.bounty.acceptedReply', { id: bounty.acceptedReplyId }) }}
        </a>
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
  padding: 12px 16px 10px;
  margin-top: 15px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border-inline-start: 3px solid var(--el-color-warning);
}

.topic-bounty-header,
.topic-bounty-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  align-items: center;
}

.topic-bounty-header {
  gap: 4px 16px;
  justify-content: space-between;
}

.topic-bounty-reward {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-weight: 600;
}

.topic-bounty-icon {
  flex: none;
  font-size: 20px;
}

.topic-bounty-points strong {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.topic-bounty-status {
  padding: 1px 7px;
  font-size: 12px;
  background: var(--el-color-warning-light-7);
  border-radius: 4px;
}

.topic-bounty-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.topic-bounty-reply-link {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
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
