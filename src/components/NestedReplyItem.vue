<script setup lang="ts">
import { computed } from 'vue';

import { getReplyKey, handleReplyLike } from '@/utils';
import { NestedReplyDisplay } from '@/constants';

import ReplyItem from './ReplyItem.vue';

import type { UserReplyTreeNode } from '@/types';

interface Props {
  node: UserReplyTreeNode;
  display: NestedReplyDisplay;
  hasNextSibling?: boolean;
  isSharedRailTerminalPath?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasNextSibling: false,
  isSharedRailTerminalPath: true,
});

const MAX_VISUAL_INDENT_DEPTH = 4;

const containerClass = computed<Record<string, boolean>>(() => {
  const isRoot = props.node.depth === 0;

  return {
    'nested-reply-item-container-root': isRoot,
  };
});

const isIncomingRailShared = computed(() => {
  if (props.node.depth === 0) {
    return false;
  }

  if (props.display === NestedReplyDisplay.Align) {
    return true;
  }

  return props.node.depth >= MAX_VISUAL_INDENT_DEPTH;
});

const shouldContinueIncomingRail = computed(() => {
  if (props.node.depth === 0) {
    return false;
  }

  if (isIncomingRailShared.value) {
    return !props.isSharedRailTerminalPath || Boolean(props.node.children.length);
  }

  return props.hasNextSibling;
});

const shouldShowReplyRail = computed(() => {
  const isRoot = props.node.depth === 0;
  const isWithinIndentLimit = props.display === NestedReplyDisplay.Indent && props.node.depth < MAX_VISUAL_INDENT_DEPTH;

  return Boolean(props.node.children.length) && (isRoot || isWithinIndentLimit);
});

const childrenClass = computed<Record<string, boolean>>(() => {
  const shouldIndent = props.display === NestedReplyDisplay.Indent && props.node.depth < MAX_VISUAL_INDENT_DEPTH;
  const shouldAlignWithRootBody = props.display === NestedReplyDisplay.Align && props.node.depth === 0;
  const shouldAlignWithoutIndent = props.display === NestedReplyDisplay.Align && props.node.depth > 0;
  const shouldContinueParentRail =
    props.display === NestedReplyDisplay.Indent &&
    props.node.depth > 0 &&
    props.node.depth < MAX_VISUAL_INDENT_DEPTH &&
    props.hasNextSibling;

  return {
    'nested-reply-item-children-indent': shouldIndent,
    'nested-reply-item-children-align-root': shouldAlignWithRootBody,
    'nested-reply-item-children-align-nested': shouldAlignWithoutIndent,
    'nested-reply-item-children-continue-parent': shouldContinueParentRail,
    'nested-reply-item-children-continue-parent-root': shouldContinueParentRail && props.node.depth === 1,
    'nested-reply-item-children-continue-parent-nested': shouldContinueParentRail && props.node.depth > 1,
  };
});

const trackClass = computed<Record<string, boolean>>(() => {
  return {
    'nested-reply-item-track-continued': shouldContinueIncomingRail.value,
  };
});

const isChildSharedRailTerminalPath = (index: number): boolean => {
  const isLastChild = index === props.node.children.length - 1;
  const childDepth = props.node.depth + 1;
  const startsAlignedRail = props.display === NestedReplyDisplay.Align && childDepth === 1;
  const startsCappedRail = props.display === NestedReplyDisplay.Indent && childDepth === MAX_VISUAL_INDENT_DEPTH;

  if (startsAlignedRail || startsCappedRail) {
    return isLastChild;
  }

  return props.isSharedRailTerminalPath && isLastChild;
};
</script>

<template>
  <div :class="['nested-reply-item-container', containerClass]">
    <div
      :class="[
        'nested-reply-item-reply',
        {
          'nested-reply-item-reply-nested': node.depth > 0,
          'nested-reply-item-reply-has-children': shouldShowReplyRail,
        },
      ]"
    >
      <div v-if="node.depth > 0" :class="['nested-reply-item-track', trackClass]" aria-hidden="true"></div>
      <ReplyItem
        v-bind="node.reply"
        :avatar-size="node.depth === 0 ? 40 : 32"
        :compact="node.depth > 0"
        @like-reply="handleReplyLike(node.reply, $event)"
      />
    </div>
    <div v-if="node.children.length" :class="['nested-reply-item-children', childrenClass]">
      <NestedReplyItem
        v-for="(childNode, index) in node.children"
        :key="getReplyKey(childNode.reply, index)"
        :node="childNode"
        :display="display"
        :has-next-sibling="index < node.children.length - 1"
        :is-shared-rail-terminal-path="isChildSharedRailTerminalPath(index)"
      />
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

  &-continue-parent::after {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 0;
    width: 0;
    content: '';
    border-left: 1px solid var(--el-border-color);
  }

  &-continue-parent-root::after {
    left: -80px;
  }

  &-continue-parent-nested::after {
    left: -84px;
  }
}

.nested-reply-item-container-root > .nested-reply-item-children {
  --nested-reply-item-rail-left: -30px;
  --nested-reply-item-elbow-width: 22px;
}
</style>
