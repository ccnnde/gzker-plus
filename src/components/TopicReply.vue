<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import { t } from '@/i18n';
import { handleReplyLike } from '@/utils';

import ConversationList from './ConversationList.vue';
import ReplyItem from './ReplyItem.vue';

import type { UserReplyItem, UserTopicReply } from '@/types';

const props = defineProps<UserTopicReply>();

const conversationList = ref<InstanceType<typeof ConversationList> | null>(null);
const userConversation = ref<UserReplyItem[]>([]);
const replyMentionUids = ref<string[]>([]);
const currentMentionUid = ref<string>('');

let currentViewReplyItem: UserReplyItem | null = null;
let currentViewReplyIndex: number = -1;

watch(currentMentionUid, (newUid, oldUid) => {
  if (oldUid === '' || newUid === '') {
    return;
  }

  parseConversation();
});

const handleConversationView = (replyItem: UserReplyItem, replyIndex: number, mentionUids: string[]) => {
  replyMentionUids.value = mentionUids;

  if (!mentionUids.length) {
    ElMessage.error(t('enhancedTopic.haveNotMentionAnyUser'));
    return;
  }

  currentMentionUid.value = mentionUids[0];
  currentViewReplyItem = replyItem;
  currentViewReplyIndex = replyIndex;

  parseConversation();
  conversationList.value?.openDialog();
};

const parseConversation = () => {
  userConversation.value = props.list.slice(0, currentViewReplyIndex + 1).filter(({ uid, content }, index) => {
    if (index === currentViewReplyIndex) {
      return true;
    }

    const isReplyUidMentioned = uid === currentMentionUid.value;
    const isReplyUidCurrentView = uid === currentViewReplyItem?.uid && content?.includes(`@${currentMentionUid.value}`);

    return isReplyUidMentioned || isReplyUidCurrentView;
  });
};

const handleConversationClose = () => {
  userConversation.value = [];
  replyMentionUids.value = [];
  currentMentionUid.value = '';
  currentViewReplyItem = null;
  currentViewReplyIndex = -1;
};
</script>

<template>
  <div class="reply-total">
    {{ $t('enhancedTopic.replyTotal', { num: total }) }}
  </div>
  <ReplyItem
    v-for="(item, index) in list"
    :key="index"
    v-bind="item"
    @like-reply="handleReplyLike(item, $event)"
    @view-conversation="handleConversationView(item, index, $event)"
  />
  <ConversationList
    ref="conversationList"
    v-model="currentMentionUid"
    :mention-uids="replyMentionUids"
    :conversations="userConversation"
    @close-conversation="handleConversationClose"
  />
</template>

<style lang="scss" scoped>
.reply-total {
  font-weight: var(--el-font-weight-primary);
  color: var(--el-text-color-primary);
}
</style>
