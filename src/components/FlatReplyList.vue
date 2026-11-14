<script setup lang="ts">
import { getReplyKey, handleReplyLike } from '@/utils';

import ReplyItem from './ReplyItem.vue';

import type { UserTopicReply } from '@/types';

defineProps<Pick<UserTopicReply, 'list'>>();
</script>

<template>
  <ReplyItem
    v-for="(item, index) in list"
    :key="getReplyKey(item, index)"
    v-bind="item"
    @like-reply="handleReplyLike(item, $event)"
  />
</template>
