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

const showReplyOrderButton = computed(() => {
  return props.replyTotal !== '0';
});

const onlyOriginalPosterIconClass = computed(() => {
  return props.onlyOriginalPoster ? 'i-mdi-account-star' : 'i-mdi-account-star-outline';
});

const onlyOriginalPosterIconStyle = computed<CSSProperties | undefined>(() => {
  const fontSize = '18px';

  if (!props.onlyOriginalPoster) {
    return {
      fontSize,
    };
  }

  return {
    color: 'var(--el-color-primary)',
    fontSize,
  };
});

const replyOrderIconStyle = computed<CSSProperties>(() => {
  const fontSize = '18px';

  if (!props.reverseReply) {
    return {
      fontSize,
    };
  }

  return {
    color: 'var(--el-color-success)',
    fontSize,
  };
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
  <div class="footer-container" :style="footerStyle">
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
    <OperateButton
      v-if="showReplyOrderButton"
      :tip-content="$t('enhancedTopic.onlyOriginalPoster')"
      :icon-class="onlyOriginalPosterIconClass"
      :custom-style="onlyOriginalPosterIconStyle"
      :tip-disabled="actionTooltipDisabled"
      @click="$emit('toggleOriginalPoster')"
    />
    <OperateButton
      v-if="showReplyOrderButton"
      :tip-content="$t('enhancedTopic.reverseReplyOrder')"
      icon-class="i-mdi-filter-variant"
      :custom-style="replyOrderIconStyle"
      :tip-disabled="actionTooltipDisabled"
      @click="$emit('toggleReplyOrder')"
    />
    <OperateButton v-if="editable" :operate-text="$t('enhancedTopic.editTopic')" @click="$emit('editTopic')" />
    <OperateButton v-else :operate-text="$t('enhancedTopic.blockTopic')" @click="$emit('blockTopic')" />
    <ElInput class="reply-input" :placeholder="$t('enhancedTopic.writeReply')" @focus="addReply?.()" />
  </div>
</template>

<style lang="scss" scoped>
.footer-container {
  display: flex;
  align-items: center;
  padding: 0 var(--gzk-topic-padding);
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom-right-radius: var(--el-border-radius-base);
  border-bottom-left-radius: var(--el-border-radius-base);
}

.reply-input {
  flex: 1;
}
</style>
