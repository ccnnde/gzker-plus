<script setup lang="ts">
import { ref } from 'vue';

import { NESTED_REPLY_DISPLAY_MODES } from '@/constants';

import OperateButton from './OperateButton.vue';

import type { NestedReplyDisplay } from '@/constants';

interface Props {
  display: NestedReplyDisplay;
  onlyOriginalPoster: boolean;
  disabled: boolean;
  tipDisabled: boolean;
}

defineProps<Props>();

defineEmits<{
  changeDisplay: [display: NestedReplyDisplay];
}>();

const menuVisible = ref(false);
</script>

<template>
  <ElDropdown
    placement="top"
    trigger="click"
    popper-class="topic-reply-display-popper"
    :disabled="disabled || onlyOriginalPoster"
    @visible-change="menuVisible = $event"
  >
    <div
      class="topic-reply-display-trigger"
      role="button"
      :aria-label="$t('enhancedTopic.nestedReplyDisplay')"
      :aria-disabled="disabled || onlyOriginalPoster"
    >
      <OperateButton
        icon-class="i-gzkp-reply-layout"
        :tip-content="
          $t(
            onlyOriginalPoster
              ? 'enhancedTopic.nestedReplyDisplayOnlyOriginalPoster'
              : 'enhancedTopic.nestedReplyDisplay',
          )
        "
        :tip-disabled="tipDisabled || menuVisible"
      />
    </div>
    <template #dropdown>
      <ElDropdownMenu>
        <ElDropdownItem
          v-for="mode in NESTED_REPLY_DISPLAY_MODES"
          :key="mode"
          :aria-current="mode === display ? 'true' : undefined"
          @click="$emit('changeDisplay', mode)"
        >
          {{ $t(`basicSetting.nestedReplyDisplay.${mode}`) }}
        </ElDropdownItem>
      </ElDropdownMenu>
    </template>
  </ElDropdown>
</template>

<style lang="scss">
.topic-reply-display-popper .el-dropdown-menu__item:not(.is-disabled) {
  &:focus {
    background-color: transparent;
    outline: none;
  }

  &:is(:hover, :focus) {
    color: var(--el-text-color-regular);
  }

  &:is(:hover, :focus-visible) {
    background-color: var(--el-fill-color-light);
  }

  &[aria-current='true'] {
    color: var(--el-color-primary);
  }
}
</style>

<style lang="scss" scoped>
.topic-reply-display-trigger[aria-disabled='true'] :deep(.operate-button-container) {
  cursor: not-allowed;

  .operate-icon {
    color: var(--el-text-color-disabled);
  }
}
</style>
