<script setup lang="ts">
import { computed, inject, nextTick, ref, useId, watch } from 'vue';
import scrollIntoView from 'scroll-into-view-if-needed';

import { getReplyKey, handleReplyLike } from '@/utils';
import { NestedReplyDisplay } from '@/constants';
import { REPLY_HOVER_INJECTION_KEY, UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import ReplyItem from './ReplyItem.vue';

import type { UserReplyTreeNode } from '@/types';

interface Props {
  node: UserReplyTreeNode;
  display: NestedReplyDisplay;
  defaultExpanded: boolean;
}

const props = defineProps<Props>();

const MAX_VISUAL_INDENT_DEPTH = 4;
const repliesId = useId();
const isExpanded = ref(false);
const hasRenderedReplies = ref(false);
const toggleButton = ref<HTMLButtonElement | null>(null);
const updateScrollbar = inject(UPDATE_SCROLLBAR_INJECTION_KEY);
const replyHover = inject(REPLY_HOVER_INJECTION_KEY);

const countDescendantReplies = (nodes: UserReplyTreeNode[]): number => {
  return nodes.reduce((count, node) => {
    return count + 1 + countDescendantReplies(node.children);
  }, 0);
};

const descendantReplyCount = computed(() => {
  return countDescendantReplies(props.node.children);
});

const shouldShowReplyRail = computed(() => {
  const isRoot = props.node.depth === 0;
  const isWithinIndentLimit = props.display === NestedReplyDisplay.Indent && props.node.depth < MAX_VISUAL_INDENT_DEPTH;

  return Boolean(props.node.children.length) && (isRoot || isWithinIndentLimit);
});

const shouldContinueSharedRail = computed(() => {
  const isSharedRail = props.display === NestedReplyDisplay.Align || props.node.depth >= MAX_VISUAL_INDENT_DEPTH;

  return props.node.depth > 0 && isSharedRail && Boolean(props.node.children.length);
});

const childrenClass = computed<Record<string, boolean>>(() => {
  const shouldIndent = props.display === NestedReplyDisplay.Indent && props.node.depth < MAX_VISUAL_INDENT_DEPTH;
  const shouldAlignWithRootBody = props.display === NestedReplyDisplay.Align && props.node.depth === 0;
  const shouldAlignWithoutIndent = props.display === NestedReplyDisplay.Align && props.node.depth > 0;

  return {
    'nested-reply-item-children-indent': shouldIndent,
    'nested-reply-item-children-align-root': shouldAlignWithRootBody,
    'nested-reply-item-children-align-nested': shouldAlignWithoutIndent,
  };
});

const toggleReplies = async () => {
  replyHover?.suppress();
  hasRenderedReplies.value = true;
  isExpanded.value = !isExpanded.value;
  await nextTick();
  updateScrollbar?.();

  if (!isExpanded.value && toggleButton.value) {
    scrollIntoView(toggleButton.value, {
      scrollMode: 'if-needed',
      block: 'nearest',
    });
  }
};

watch(
  () => props.defaultExpanded,
  (expanded) => {
    isExpanded.value = expanded;

    if (expanded) {
      hasRenderedReplies.value = true;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div :class="['nested-reply-item-container', { 'nested-reply-item-container-root': node.depth === 0 }]">
    <div
      :class="[
        'nested-reply-item-reply',
        {
          'nested-reply-item-reply-nested': node.depth > 0,
          'nested-reply-item-reply-has-children': shouldShowReplyRail,
        },
      ]"
    >
      <div
        v-if="node.depth > 0"
        :class="['nested-reply-item-track', { 'nested-reply-item-track-continued': shouldContinueSharedRail }]"
        aria-hidden="true"
      ></div>
      <ReplyItem
        v-bind="node.reply"
        :avatar-size="node.depth === 0 ? 40 : 32"
        :compact="node.depth > 0"
        @like-reply="handleReplyLike(node.reply, $event)"
      />
    </div>
    <div v-if="node.children.length" :class="['nested-reply-item-children', childrenClass]">
      <div
        v-show="node.depth > 0 || isExpanded"
        :id="repliesId"
        :class="['nested-reply-item-branch', { 'nested-reply-item-branch-root': node.depth === 0 }]"
      >
        <template v-if="node.depth > 0 || hasRenderedReplies">
          <NestedReplyItem
            v-for="(childNode, index) in node.children"
            :key="getReplyKey(childNode.reply, index)"
            :node="childNode"
            :display="display"
            :default-expanded="defaultExpanded"
          />
        </template>
      </div>
      <div v-if="node.depth === 0" class="nested-reply-item-toggle">
        <div class="nested-reply-item-track" aria-hidden="true"></div>
        <button
          ref="toggleButton"
          class="nested-reply-item-toggle-button"
          type="button"
          :aria-expanded="isExpanded"
          :aria-controls="repliesId"
          @click="toggleReplies"
        >
          <span>
            {{
              isExpanded
                ? $t('enhancedTopic.collapseReplies')
                : $t('enhancedTopic.expandReplies', { count: descendantReplyCount }, descendantReplyCount)
            }}
          </span>
          <span
            :class="['nested-reply-item-toggle-icon', isExpanded ? 'i-mdi-chevron-up' : 'i-mdi-chevron-down']"
            aria-hidden="true"
          ></span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '@/styles/mixin';

.nested-reply-item-container {
  position: relative;

  &-root + &-root {
    @include reply-root-divider;
  }
}

.nested-reply-item-reply {
  position: relative;

  &-has-children::after {
    position: absolute;
    top: 59px;
    bottom: 0;
    left: 20px;
    z-index: 0;
    width: 0;
    content: '';
    border-left: 1px solid var(--el-border-color);
  }

  &-nested#{&}-has-children::after {
    top: 46px;
    left: 16px;
  }

  :deep(.reply-avatar) {
    position: relative;
    z-index: 3;
  }
}

.nested-reply-item-track {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--nested-reply-item-rail-left);
  z-index: 2;
  width: var(--nested-reply-item-elbow-width);
  pointer-events: none;

  &::before {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 26px;
    content: '';
    border-bottom: 1px solid var(--el-border-color);
    border-left: 1px solid var(--el-border-color);
    border-bottom-left-radius: 16px;
  }

  &-continued::after {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 0;
    content: '';
    border-left: 1px solid var(--el-border-color);
  }
}

.nested-reply-item-children {
  --nested-reply-item-rail-left: -34px;
  --nested-reply-item-elbow-width: 26px;

  position: relative;

  &-indent,
  &-align-root {
    margin-left: 50px;
  }

  &-align-root,
  &-align-nested {
    --nested-reply-item-rail-left: -30px;
    --nested-reply-item-elbow-width: 22px;
  }

  &-align-nested {
    margin-left: 0;
  }
}

.nested-reply-item-container-root > .nested-reply-item-children {
  --nested-reply-item-rail-left: -30px;
  --nested-reply-item-elbow-width: 22px;
}

.nested-reply-item-branch {
  position: relative;
}

.nested-reply-item-branch-root::before,
.nested-reply-item-branch > .nested-reply-item-container:not(:last-child)::after {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--nested-reply-item-rail-left);
  width: 0;
  pointer-events: none;
  content: '';
  border-left: 1px solid var(--el-border-color);
}

.nested-reply-item-toggle {
  position: relative;
  padding: 6px 0 12px;
}

.nested-reply-item-toggle-button {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  margin-left: -10px;
  font: inherit;
  line-height: 24px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--el-border-radius-base);
  transition: color 0.15s ease;

  &:hover {
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.nested-reply-item-toggle-icon {
  flex: none;
  width: 20px;
  height: 20px;
}
</style>
