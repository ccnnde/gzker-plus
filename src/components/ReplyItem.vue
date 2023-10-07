<script setup lang="ts">
import { inject } from 'vue';

import { useRequest } from '@/composables/request';
import { vImgLoad } from '@/directives';
import { likeReply } from '@/api';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import LikeButton from './LikeButton.vue';
import OperateButton from './OperateButton.vue';
import UserAvatar from './UserAvatar.vue';

import type { UserReplyItem } from '@/types';

const props = defineProps<UserReplyItem>();

const emit = defineEmits<{
  likeReply: [msg: string];
}>();

const { isLoading, handleRequest } = useRequest();

const handleReplyLike = async () => {
  handleRequest(async () => {
    const data = await likeReply(props.replyId);
    emit('likeReply', data);
  });
};

const updateScrollbar = inject(UPDATE_SCROLLBAR_INJECTION_KEY);
</script>

<template>
  <div v-loading="isLoading" class="reply-container">
    <UserAvatar :uid="uid" :user-link="userLink" :avatar-url="avatarUrl" />
    <div class="reply-main">
      <div class="reply-header">
        <span>
          <a class="reply-user user-id" :href="userLink" target="_blank">
            {{ uid }}
          </a>
          <span v-if="isOriginalPoster" class="relative">
            <ElTag class="absolute" size="small">
              {{ $t('enhancedTopic.originalPoster') }}
            </ElTag>
          </span>
        </span>
        <span class="number-info">#{{ replyNo }}</span>
      </div>
      <div class="reply-meta user-meta">
        <span>{{ replyTime }}</span>
        <span v-if="replyIp">{{ replyIp }}</span>
      </div>
      <div v-img-load="updateScrollbar" class="main-content" v-html="content"></div>
      <div class="reply-footer">
        <LikeButton :liked="liked" :like-number="likeNumber" @handle-like="handleReplyLike" />
        <OperateButton :tip-content="$t('common.reply')" icon-class="i-mdi-chat-outline" />
        <OperateButton :operate-text="$t('enhancedTopic.viewConversation')" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.reply-container {
  display: flex;
  align-items: flex-start;
  padding: 15px 0;

  & + .reply-container {
    border-top: 1px solid var(--el-border-color);
  }
}

.reply-main {
  flex: 1;
  margin-left: 10px;
}

.reply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reply-user {
  margin-right: 10px;
  font-size: 14px;
}

.reply-meta {
  margin: 8px 0;
  font-size: 12px;
}

.reply-footer {
  display: flex;
}
</style>
