<script setup lang="ts">
import { computed } from 'vue';

import OperateButton from './OperateButton.vue';

import type { CSSProperties } from 'vue';

interface Props {
  liked?: boolean;
  likeNumber?: string;
  hideTip?: boolean;
}

const props = defineProps<Props>();

defineEmits<{
  handleLike: [];
}>();

const likeIconClass = computed(() => {
  return props.liked ? 'i-mdi-heart' : 'i-mdi-heart-outline';
});

const likeButtonStyle = computed<CSSProperties | undefined>(() => {
  if (props.liked) {
    return {
      color: '#f46262',
    };
  }

  return undefined;
});
</script>

<template>
  <OperateButton
    :tip-content="hideTip ? undefined : $t('enhancedTopic.like')"
    :icon-class="likeIconClass"
    :operate-text="likeNumber"
    :custom-style="likeButtonStyle"
    @click="$emit('handleLike')"
  />
</template>
