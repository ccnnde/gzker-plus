<script setup lang="ts">
import { getReplyKey, handleReplyLike } from '@/utils';

import ReplyItem from './ReplyItem.vue';

import type { UserTopicReply } from '@/types';

defineProps<UserTopicReply>();
</script>

<template>
  <div class="flat-reply-list-total">
    {{ $t('enhancedTopic.replyTotal', { num: total }) }}
  </div>
  <ReplyItem
    v-for="(item, index) in list"
    :key="getReplyKey(item, index)"
    v-bind="item"
    @like-reply="handleReplyLike(item, $event)"
  />
</template>

<style lang="scss" scoped>
.flat-reply-list-total {
  font-weight: var(--el-font-weight-primary);
  color: var(--el-text-color-primary);
}
</style>
