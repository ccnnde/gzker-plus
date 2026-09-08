<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';

import { addUnit } from '@/utils';
import { ADD_REPLY_INJECTION_KEY } from '@/constants/inject-key';

import LikeButton from './LikeButton.vue';
import OperateButton from './OperateButton.vue';

import type { CSSProperties } from 'vue';

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
    <OperateButton
      v-if="editable"
      :tip-content="$t('enhancedTopic.editTopic')"
      icon-class="i-mdi-pencil-outline"
      :tip-disabled="actionTooltipDisabled"
      @click="$emit('editTopic')"
    />
    <OperateButton
      v-else
      :tip-content="$t('enhancedTopic.blockTopic')"
      icon-class="i-mdi-eye-off-outline"
      :tip-disabled="actionTooltipDisabled"
      @click="$emit('blockTopic')"
    />
    <ElInput class="topic-footer-reply-input" :placeholder="$t('enhancedTopic.writeReply')" @focus="addReply?.()" />
  </div>
</template>

<style lang="scss" scoped>
.topic-footer-container {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 0 var(--gzk-topic-padding);
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom-right-radius: var(--el-border-radius-base);
  border-bottom-left-radius: var(--el-border-radius-base);

  :deep(.operate-button-container) {
    padding: 0 8px;
    margin-right: 0;

    &:first-child {
      padding-left: 0;
    }
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
  margin-left: 8px;
}
</style>
