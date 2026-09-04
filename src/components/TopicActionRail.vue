<script setup lang="ts">
import type { TopicAction } from '@/types';

interface Props {
  actions: readonly TopicAction[];
}

defineProps<Props>();
</script>

<template>
  <div class="topic-action-rail">
    <div
      v-for="action in actions"
      :key="action.label"
      :class="['topic-action-rail-item', { 'topic-action-rail-item-divided': action.showDivider }]"
    >
      <ElTooltip :content="action.label" :enterable="false" :hide-after="0" placement="left">
        <button
          class="topic-action-rail-button"
          type="button"
          :aria-label="action.label"
          :aria-busy="action.loading ? 'true' : undefined"
          :disabled="action.loading"
          @click="action.handler()"
        >
          <span
            :class="['topic-action-rail-button-icon', action.loading ? 'i-mdi-loading animate-spin' : action.iconClass]"
          ></span>
        </button>
      </ElTooltip>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.topic-action-rail {
  position: absolute;
  right: -48px;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.topic-action-rail-item {
  position: relative;
  width: 36px;
  height: 36px;
}

.topic-action-rail-item-divided {
  margin-top: 12px;

  &::before {
    position: absolute;
    top: -11px;
    left: 50%;
    width: 24px;
    height: 2px;
    pointer-events: none;
    content: '';
    background-color: var(--el-border-color-darker);
    border-radius: 1px;
    transform: translateX(-50%);
  }
}

.topic-action-rail-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-light);
  transition: color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover,
  &:focus-visible {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary);
    outline: none;
    box-shadow: 0 4px 12px rgb(var(--el-color-primary-rgb) 0.18);
  }

  &:active {
    transform: scale(0.94);
  }

  &:disabled {
    cursor: default;
  }
}

.topic-action-rail-button-icon {
  font-size: 16px;
}
</style>
