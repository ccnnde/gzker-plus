<script setup lang="ts">
import { computed } from 'vue';

import type { CSSProperties } from 'vue';

interface Props {
  tipContent?: string;
  iconClass?: string;
  operateText?: string | number;
  customStyle?: CSSProperties;
}

const props = defineProps<Props>();

defineEmits<{
  click: [];
}>();

const disableTip = computed(() => {
  return props.tipContent === undefined;
});

const showOperateIcon = computed(() => {
  return props.iconClass !== undefined;
});

const showOperateText = computed(() => {
  return props.operateText !== undefined;
});
</script>

<template>
  <ElTooltip :content="tipContent" :disabled="disableTip" :show-arrow="false">
    <div class="operate-button-container" @click="$emit('click')">
      <div v-if="showOperateIcon" :style="customStyle" :class="['operate-icon', iconClass]"></div>
      <span v-if="showOperateText" :style="customStyle" class="operate-text">{{ operateText }}</span>
    </div>
  </ElTooltip>
</template>

<style lang="scss" scoped>
.operate-icon {
  font-size: 16px;
}

.operate-text {
  font-size: 14px;
}

.operate-icon,
.operate-text {
  color: var(--el-text-color-secondary);
}

.operate-icon + .operate-text {
  padding-left: 2px;
}

.operate-button-container {
  display: flex;
  align-items: center;
  margin-right: 15px;
  cursor: pointer;

  &:hover {
    .operate-icon,
    .operate-text {
      color: var(--el-text-color-regular);
    }
  }
}
</style>
