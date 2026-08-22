<script setup lang="ts">
import { computed } from 'vue';

import { getReplyKey } from '@/utils';
import { buildReplyTree } from '@/utils/reply-tree';

import NestedReplyItem from './NestedReplyItem.vue';

import type { NestedReplyDisplay } from '@/constants';
import type { UserReplyBatch, UserReplyTreeNode } from '@/types';

interface Props {
  batch: UserReplyBatch;
  display: NestedReplyDisplay;
  multipleInsideOne: boolean;
}

const props = defineProps<Props>();

const replyTree = computed<UserReplyTreeNode[]>(() => {
  return buildReplyTree(props.batch.list, props.multipleInsideOne);
});
</script>

<template>
  <div class="nested-reply-batch-container">
    <NestedReplyItem
      v-for="(node, index) in replyTree"
      :key="getReplyKey(node.reply, index)"
      :node="node"
      :display="display"
    />
  </div>
</template>

<style lang="scss" scoped>
.nested-reply-batch-container {
  position: relative;

  & + & {
    padding-top: 4px;
    margin-top: 4px;
    border-top: 1px solid var(--el-border-color-light);
  }
}
</style>
