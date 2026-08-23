<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import scrollIntoView from 'scroll-into-view-if-needed';

import { useRequest } from '@/composables/request';
import { vImgLoad } from '@/directives';
import { getEditedReply, likeReply } from '@/api';
import { convertEmojiToNative } from '@/utils/emoji';
import { parseReplyMentions, renderReplyContent } from '@/utils/reply-content';
import {
  ADD_REPLY_INJECTION_KEY,
  EDIT_REPLY_INJECTION_KEY,
  UPDATE_SCROLLBAR_INJECTION_KEY,
} from '@/constants/inject-key';

import LikeButton from './LikeButton.vue';
import OperateButton from './OperateButton.vue';
import UserAvatar from './UserAvatar.vue';

import type { UserReplyItem } from '@/types';

interface Props extends UserReplyItem {
  avatarSize?: number;
  compact?: boolean;
  isNotInConversation?: boolean;
  showConversationAction?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  avatarSize: 40,
  compact: false,
  isNotInConversation: true,
  showConversationAction: true,
});

const emit = defineEmits<{
  likeReply: [msg: string];
  viewConversation: [mentionUids: string[]];
}>();

const { isLoading, handleRequest } = useRequest();
const replyItemEl = ref<HTMLDivElement | null>(null);

const renderedContent = computed<string>(() => {
  const content = convertEmojiToNative(props.content) || '';
  return renderReplyContent(content);
});

const mentionUids = computed<string[]>(() => {
  const uids = parseReplyMentions(props.content).map(({ uid }) => uid);
  return [...new Set(uids)];
});

const hasMention = computed<boolean>(() => {
  return Boolean(mentionUids.value.length);
});

const handleReplyLike = () => {
  handleRequest(async () => {
    const data = await likeReply(props.replyId);
    emit('likeReply', data);
  });
};

const handleConversationView = () => {
  emit('viewConversation', mentionUids.value);
};

const updateScrollbar = inject(UPDATE_SCROLLBAR_INJECTION_KEY);

const addReply = inject(ADD_REPLY_INJECTION_KEY);

const handleUserReply = () => {
  const content = `@${props.uid} #${props.replyNo} `;
  addReply?.(content);

  setTimeout(() => {
    if (replyItemEl.value) {
      scrollIntoView(replyItemEl.value, {
        scrollMode: 'if-needed',
        block: 'nearest',
      });
    }
  });
};

const editReply = inject(EDIT_REPLY_INJECTION_KEY);

const handleReplyEdit = () => {
  handleRequest(async () => {
    const reply = await getEditedReply(props.replyId);
    editReply?.(reply);
  });
};
</script>

<template>
  <div ref="replyItemEl" v-loading="isLoading" :class="['reply-container', { 'reply-container-compact': compact }]">
    <div class="reply-avatar">
      <UserAvatar :uid="uid" :user-link="userLink" :avatar-url="avatarUrl" :avatar-size="avatarSize" />
    </div>
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
      <div v-img-load="updateScrollbar" class="main-content markdown-body" v-html="renderedContent"></div>
      <div class="reply-footer">
        <LikeButton :liked="liked" :like-number="likeNumber" hide-tip @handle-like="handleReplyLike" />
        <template v-if="isNotInConversation">
          <OperateButton icon-class="i-mdi-chat-outline" @click="handleUserReply" />
          <OperateButton
            v-if="showConversationAction && hasMention"
            :operate-text="$t('enhancedTopic.viewConversation')"
            @click="handleConversationView"
          />
          <OperateButton v-if="editable" :operate-text="$t('enhancedTopic.editReply')" @click="handleReplyEdit" />
        </template>
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

.reply-container-compact {
  padding: 10px 0;
}

.reply-avatar {
  display: flex;
  flex: 0 0 40px;
  justify-content: flex-start;
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
