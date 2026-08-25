<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import scrollIntoView from 'scroll-into-view-if-needed';

import { useRequest } from '@/composables/request';
import { vImgLoad } from '@/directives';
import { getEditedReply, likeReply } from '@/api';
import { convertEmojiToNative } from '@/utils/emoji';
import { getReplyMentionFloor, getReplyMentionUid, renderReplyContent } from '@/utils/reply-content';
import {
  ADD_REPLY_INJECTION_KEY,
  EDIT_REPLY_INJECTION_KEY,
  MENTION_REPLIES_INJECTION_KEY,
  UPDATE_SCROLLBAR_INJECTION_KEY,
} from '@/constants/inject-key';
import { SELECTOR_USER_MENTION_LINK } from '@/constants/selector';

import LikeButton from './LikeButton.vue';
import OperateButton from './OperateButton.vue';
import UserAvatar from './UserAvatar.vue';

import type { UserReplyItem } from '@/types';

interface Props extends UserReplyItem {
  avatarSize?: number;
  compact?: boolean;
  isNotInConversation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  avatarSize: 40,
  compact: false,
  isNotInConversation: true,
});

const emit = defineEmits<{
  likeReply: [msg: string];
}>();

const { isLoading, handleRequest } = useRequest();
const replyItemEl = ref<HTMLDivElement | null>(null);

const renderedContent = computed<string>(() => {
  const content = convertEmojiToNative(props.content) || '';
  return renderReplyContent(content);
});

const mentionReplies = inject(MENTION_REPLIES_INJECTION_KEY);

const getMentionAnchor = (event: Event): HTMLAnchorElement | null => {
  if (!mentionReplies) {
    return null;
  }

  const target = event.target;
  const currentTarget = event.currentTarget;

  if (!(target instanceof Element) || !(currentTarget instanceof HTMLElement)) {
    return null;
  }

  const mentionAnchor = target.closest<HTMLAnchorElement>(SELECTOR_USER_MENTION_LINK);

  if (!mentionAnchor || !currentTarget.contains(mentionAnchor)) {
    return null;
  }

  return mentionAnchor;
};

const isSameMentionTarget = (mentionAnchor: HTMLAnchorElement, relatedTarget: EventTarget | null): boolean => {
  return relatedTarget instanceof Node && mentionAnchor.contains(relatedTarget);
};

const handleMentionEnter = (event: MouseEvent | FocusEvent): void => {
  const mentionAnchor = getMentionAnchor(event);

  if (!mentionAnchor || isSameMentionTarget(mentionAnchor, event.relatedTarget)) {
    return;
  }

  const mentionUid = getReplyMentionUid(mentionAnchor);

  if (!mentionUid) {
    return;
  }

  mentionReplies?.show({
    replyId: props.replyId,
    replyNo: props.replyNo,
    mentionFloor: getReplyMentionFloor(mentionAnchor),
    mentionUid,
    referenceElement: mentionAnchor,
  });
};

const handleMentionLeave = (event: MouseEvent | FocusEvent): void => {
  const mentionAnchor = getMentionAnchor(event);

  if (!mentionAnchor || isSameMentionTarget(mentionAnchor, event.relatedTarget)) {
    return;
  }

  mentionReplies?.hide(mentionAnchor);
};

const handleReplyLike = () => {
  handleRequest(async () => {
    const data = await likeReply(props.replyId);
    emit('likeReply', data);
  });
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
  <div
    ref="replyItemEl"
    v-loading="isLoading"
    :class="['reply-container', { 'reply-container-compact': compact }]"
    :data-reply-no="replyNo"
  >
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
          <span v-else-if="isAdministrator" class="relative">
            <ElTag class="absolute" type="danger" size="small">
              {{ $t('enhancedTopic.administrator') }}
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
        v-img-load="updateScrollbar"
        class="main-content markdown-body"
        @mouseover="handleMentionEnter"
        @mouseout="handleMentionLeave"
        @focusin="handleMentionEnter"
        @focusout="handleMentionLeave"
        v-html="renderedContent"
      ></div>
      <div class="reply-footer">
        <LikeButton :liked="liked" :like-number="likeNumber" hide-tip @handle-like="handleReplyLike" />
        <template v-if="isNotInConversation">
          <OperateButton icon-class="i-mdi-chat-outline" @click="handleUserReply" />
          <OperateButton v-if="editable" :operate-text="$t('enhancedTopic.editReply')" @click="handleReplyEdit" />
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '@/styles/mixin';

.reply-container {
  display: flex;
  align-items: flex-start;
  padding: 15px 0;

  & + & {
    @include reply-root-divider;
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
