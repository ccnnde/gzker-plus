<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import scrollIntoView from 'scroll-into-view-if-needed';

import { useRequest } from '@/composables/request';
import { vImgLoad } from '@/directives';
import { API_USER, getEditedReply, likeReply } from '@/api';
import { convertEmojiToNative } from '@/utils/emoji';
import {
  ADD_REPLY_INJECTION_KEY,
  EDIT_REPLY_INJECTION_KEY,
  UPDATE_SCROLLBAR_INJECTION_KEY,
} from '@/constants/inject-key';
import { SELECTOR_USER_MENTION_LINK } from '@/constants/selector';

import LikeButton from './LikeButton.vue';
import OperateButton from './OperateButton.vue';
import UserAvatar from './UserAvatar.vue';

import type { UserReplyItem, UserReplyMention } from '@/types';

interface Props extends UserReplyItem {
  isNotInConversation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isNotInConversation: true,
});

const emit = defineEmits<{
  likeReply: [msg: string];
  viewConversation: [mentionUids: string[]];
}>();

const { isLoading, handleRequest } = useRequest();
const replyItemEl = ref<HTMLDivElement | null>(null);
const contentEl = ref<HTMLDivElement | null>(null);

const hasMention = computed(() => {
  return props.content?.includes('class="user-mention">@');
});

const handleReplyLike = () => {
  handleRequest(async () => {
    const data = await likeReply(props.replyId);
    emit('likeReply', data);
  });
};

const handleConversationView = () => {
  const mentionElements = contentEl.value?.querySelectorAll<HTMLAnchorElement>(SELECTOR_USER_MENTION_LINK);
  let mentionUsers: string[] = [];

  mentionElements?.forEach((element) => {
    const uid = element.href.split(API_USER)[1];
    mentionUsers.push(uid);
  });

  mentionUsers = [...new Set(mentionUsers)];

  const mentionList: UserReplyMention[] = [];
  const contentText = contentEl.value ? contentEl.value.innerText : '';

  mentionUsers.forEach((uid) => {
    const mentionRegExp = new RegExp(`@${uid}\\s?(#(\\d+)\\s?)?`, 'g');
    const currentMentionUsers = [...contentText.matchAll(mentionRegExp)];
    const currentMentionFloors = [...new Set(currentMentionUsers.map((item) => item[2]))];

    currentMentionFloors.forEach((floor) =>
      mentionList.push({
        uid,
        floor,
      }),
    );
  });

  const mentionUids = [...new Set(mentionList.map((item) => item.uid))];
  emit('viewConversation', mentionUids);
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
  <div ref="replyItemEl" v-loading="isLoading" class="reply-container">
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
      <div
        ref="contentEl"
        v-img-load="updateScrollbar"
        class="main-content markdown-body"
        v-html="convertEmojiToNative(content)"
      ></div>
      <div class="reply-footer">
        <LikeButton :liked="liked" :like-number="likeNumber" hide-tip @handle-like="handleReplyLike" />
        <template v-if="isNotInConversation">
          <OperateButton icon-class="i-mdi-chat-outline" @click="handleUserReply" />
          <OperateButton
            v-if="hasMention"
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
