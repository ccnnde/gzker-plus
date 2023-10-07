<script setup lang="ts">
import { ALREADY_LIKE, SUCCESS_LIKE } from '@/constants/res-msg';

import ReplyItem from './ReplyItem.vue';

import type { UserReplyItem, UserTopicReply } from '@/types';

defineProps<UserTopicReply>();

const handleReplyLike = (item: UserReplyItem, msg: string) => {
  if (msg === SUCCESS_LIKE || msg === ALREADY_LIKE) {
    item.liked = true;
  }

  if (msg === SUCCESS_LIKE) {
    item.likeNumber = String(Number(item.likeNumber) + 1);
  }
};
</script>

<template>
  <div class="reply-total">
    {{ $t('enhancedTopic.replyTotal', { num: total }) }}
  </div>
  <ReplyItem v-for="(item, index) in list" :key="index" v-bind="item" @like-reply="handleReplyLike(item, $event)" />
</template>

<style lang="scss" scoped>
.reply-total {
  font-weight: var(--el-font-weight-primary);
  color: var(--el-text-color-primary);
}
</style>
