<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';

import { addUnit } from '@/utils';
import { ADD_REPLY_INJECTION_KEY } from '@/constants/inject-key';

import LikeButton from './LikeButton.vue';
import OperateButton from './OperateButton.vue';
import TopicReplyDisplay from './TopicReplyDisplay.vue';

import type { CSSProperties } from 'vue';
import type { NestedReplyDisplay } from '@/constants';

interface Props {
  replyTotal?: string;
  favorited?: boolean;
  favoriteNumber?: string;
  liked?: boolean;
  likeNumber?: string;
  editable?: boolean;
  height: number;
  reverseReply?: boolean;
  onlyOriginalPoster?: boolean;
  replyDisplay: NestedReplyDisplay;
  replyFocusing: boolean;
  showReplyDisplay: boolean;
  loading?: boolean;
}

const props = defineProps<Props>();

defineEmits<{
  scrollToReplyTotal: [];
  favoriteTopic: [];
  likeTopic: [];
  editTopic: [];
  blockTopic: [];
  toggleReplyOrder: [];
  toggleOriginalPoster: [];
  changeReplyDisplay: [display: NestedReplyDisplay];
}>();

const TOOLTIP_ENABLE_DELAY = 500;

const actionTooltipDisabled = ref(false);

let enableTooltipTimer: number | undefined;

const favoriteIconClass = computed(() => {
  return props.favorited ? 'i-mdi-bookmark' : 'i-mdi-bookmark-outline';
});

const favoriteButtonStyle = computed<CSSProperties | undefined>(() => {
  if (props.favorited) {
    return {
      color: '#F9CB0E',
    };
  }

  return undefined;
});

const footerStyle = computed<CSSProperties>(() => {
  return {
    height: addUnit(props.height),
  };
});

const onlyOriginalPosterIconStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    fontSize: '18px',
  };

  if (props.onlyOriginalPoster) {
    style.color = 'var(--el-color-primary)';
  }

  return style;
});

const replyOrderIconStyle = computed<CSSProperties | undefined>(() => {
  if (props.reverseReply) {
    return {
      color: 'var(--el-color-primary)',
    };
  }

  return undefined;
});

watch(
  () => props.loading,
  (loading) => {
    window.clearTimeout(enableTooltipTimer);
    enableTooltipTimer = undefined;

    if (loading) {
      actionTooltipDisabled.value = true;
      return;
    }

    if (!actionTooltipDisabled.value) {
      return;
    }

    enableTooltipTimer = window.setTimeout(() => {
      actionTooltipDisabled.value = false;
      enableTooltipTimer = undefined;
    }, TOOLTIP_ENABLE_DELAY);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  window.clearTimeout(enableTooltipTimer);
});

const addReply = inject(ADD_REPLY_INJECTION_KEY);
</script>

<template>
  <div class="topic-footer-container" :style="footerStyle">
    <OperateButton
      :tip-content="$t('common.reply')"
      icon-class="i-mdi-chat-outline"
      :operate-text="replyTotal"
      @click="$emit('scrollToReplyTotal')"
    />
    <OperateButton
      :tip-content="$t('common.favorite')"
      :icon-class="favoriteIconClass"
      :operate-text="favoriteNumber"
      :custom-style="favoriteButtonStyle"
      :tip-disabled="actionTooltipDisabled"
      @click="$emit('favoriteTopic')"
    />
    <LikeButton
      :liked="liked"
      :like-number="likeNumber"
      :tip-disabled="actionTooltipDisabled"
      @handle-like="$emit('likeTopic')"
    />
    <span class="topic-footer-divider" aria-hidden="true"></span>
    <OperateButton
      :tip-content="$t('enhancedTopic.onlyOriginalPoster')"
      icon-class="i-mdi-account-outline"
      :custom-style="onlyOriginalPosterIconStyle"
      :tip-disabled="actionTooltipDisabled"
      @click="$emit('toggleOriginalPoster')"
    />
    <OperateButton
      :tip-content="$t('enhancedTopic.reverseReplyOrder')"
      icon-class="i-mdi-sort-descending"
      :custom-style="replyOrderIconStyle"
      :tip-disabled="actionTooltipDisabled"
      @click="$emit('toggleReplyOrder')"
    />
    <TopicReplyDisplay
      v-if="showReplyDisplay"
      :display="replyDisplay"
      :only-original-poster="!!onlyOriginalPoster"
      :disabled="!!loading || replyFocusing"
      :tip-disabled="actionTooltipDisabled"
      @change-display="$emit('changeReplyDisplay', $event)"
    />
    <OperateButton v-if="editable" :operate-text="$t('enhancedTopic.editTopic')" @click="$emit('editTopic')" />
    <OperateButton v-else :operate-text="$t('enhancedTopic.blockTopic')" @click="$emit('blockTopic')" />
    <ElInput class="topic-footer-reply-input" :placeholder="$t('enhancedTopic.writeReply')" @focus="addReply?.()" />
  </div>
</template>

<style lang="scss" scoped>
.topic-footer-container {
  --topic-footer-gap: 6px;
  --topic-footer-action-padding: 8px;

  display: flex;
  gap: var(--topic-footer-gap);
  align-items: center;
  padding: 0 var(--gzkp-topic-padding);
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom-right-radius: var(--el-border-radius-base);
  border-bottom-left-radius: var(--el-border-radius-base);

  :deep(.operate-button-container) {
    padding: 0 var(--topic-footer-action-padding);
    margin-right: 0;
  }

  > :deep(.operate-button-container:first-child) {
    padding-left: 0;
  }
}

.topic-footer-divider {
  flex: 0 0 1px;
  height: 20px;
  margin: 0 4px 0 8px;
  background-color: var(--el-border-color);
}

.topic-footer-reply-input {
  flex: 1;
  margin-inline-start: calc(var(--gzkp-topic-padding) - var(--topic-footer-gap) - var(--topic-footer-action-padding));
}
</style>
