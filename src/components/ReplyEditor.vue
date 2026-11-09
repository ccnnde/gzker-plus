<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { debounce } from 'lodash-es';

import { useContentEditor } from '@/composables/content-editor';
import { useRequest } from '@/composables/request';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { createReply, modifyReply } from '@/api';
import { addUnit } from '@/utils';
import {
  EditHistoryType,
  getReplyCreateHistoryId,
  getReplyModifyHistoryId,
  saveEditHistory,
} from '@/utils/edit-history';
import { convertWeiboEmojiToImg, convertWeiboImgToEmoji } from '@/utils/emoji';
import { GZK_AI_AGENT_UID } from '@/constants';

import ContentEditor from './ContentEditor.vue';
import EmojiPicker from './EmojiPicker.vue';
import MentionPicker from './MentionPicker.vue';
import WeiboEmojiPicker from './WeiboEmojiPicker.vue';

import type { CSSProperties } from 'vue';
import type { EditHistoryItem, MentionUser, ReplyMentionBinding, UserReplyItem, UserTopic } from '@/types';

interface Props {
  topicId?: string;
  replyList: UserReplyItem[];
  height: number;
  fullscreen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  sended: [data: UserTopic];
  modified: [data: UserTopic, replyId: string];
  closed: [];
  toggleFullscreen: [];
}>();

let editedReplyId: string;

const editorVisible = ref(false);
const replyContent = ref('');
const {
  isAddContent,
  contentEditor,
  emojiPicker,
  mentionPicker,
  mentionPickerStyle,
  weiboEmojiPicker,
  weiboEmojiPickerStyle,
  insertUid,
  insertEmoji,
  insertWeiboEmoji,
  clearContent,
  refreshEditor,
  resetEditorLayout,
  showMentionPicker,
  showWeiboEmojiPicker,
  isEmojiPickerVisible,
} = useContentEditor();

const editorTitle = computed(() => {
  return isAddContent.value ? t('enhancedTopic.createReply') : t('enhancedTopic.editReply');
});

const editorStyle = computed<CSSProperties>(() => {
  return {
    height: addUnit(props.height),
  };
});

const editorFullscreenClass = computed(() => {
  return props.fullscreen ? 'gzkp-reply-editor-fullscreen' : 'gzkp-reply-editor-minscreen';
});

const topicMentionUsers = computed(() => {
  const users = new Map<string, MentionUser>();
  users.set(GZK_AI_AGENT_UID, { uid: 0, username: GZK_AI_AGENT_UID, display_name: GZK_AI_AGENT_UID });

  for (const { uid, userId, displayName, avatarUrl } of props.replyList) {
    if (!uid || (users.has(uid) && !userId)) {
      continue;
    }

    users.set(uid, { uid: Number(userId) || 0, username: uid, display_name: displayName || uid, avatar: avatarUrl });
  }

  return [...users.values()];
});

const pickMention = (username: string, user?: MentionUser) => {
  if (isAddContent.value && user?.uid) {
    contentEditor.value?.insertMention(`@${user.display_name}`, { uid: user.uid });
  } else {
    insertUid(username);
  }
};

watch(
  () => props.fullscreen,
  () => {
    refreshEditor();
  },
);

const openEditor = () => {
  editorVisible.value = true;

  setTimeout(() => {
    contentEditor.value?.focusEndOfEditor();
  });
};

const dismissSelectPicker = () => {
  return mentionPicker.value?.hidePicker() || weiboEmojiPicker.value?.hidePicker();
};

const closeEditor = () => {
  editorVisible.value = false;

  if (!isAddContent.value) {
    modifyHistoryId = '';
    clearContent();
  }

  contentEditor.value?.hideAllSubMenu();
  emit('closed');
};

const addReply = (reply?: UserReplyItem) => {
  if (!isAddContent.value) {
    clearContent();
  }

  isAddContent.value = true;

  if (!reply) {
    return;
  }

  const { displayName, uid, userId, replyId, replyNo } = reply;
  const name = (userId && displayName) || uid;

  if (!name) {
    return;
  }

  const label = replyNo ? `@${name} #${replyNo}` : `@${name}`;
  contentEditor.value?.insertMention(label, {
    uid: Number(userId),
    replyId: Number(replyId) || 0,
    append: true,
  });
};

const editReply = (reply: UserReplyItem) => {
  isAddContent.value = false;
  editedReplyId = reply.replyId as string;
  modifyHistoryId = '';

  const content = convertWeiboImgToEmoji(reply.content as string);
  contentEditor.value?.setValue(content);

  setTimeout(() => {
    generateModifyHistoryId();
  }, 300);
};

const { isLoading, handleRequest } = useRequest();

const prepareReply = (draft: string, mentions: ReplyMentionBinding[]) => {
  const bindings: ReplyMentionBinding[] = [];
  let content = '';
  let draftOffset = 0;

  for (const mention of mentions) {
    const { start, end, label } = mention;

    if (draft.slice(start, end) !== label) {
      continue;
    }

    content += convertWeiboEmojiToImg(draft.slice(draftOffset, start));
    const labelStart = content.length;
    content += label;
    bindings.push({ ...mention, start: labelStart, end: content.length });
    draftOffset = end;
  }

  content += convertWeiboEmojiToImg(draft.slice(draftOffset));
  return { content, bindings };
};

const sendReply = () => {
  if (isLoading.value) {
    return;
  }

  const draft = contentEditor.value?.getValue() ?? replyContent.value;

  if (!draft) {
    ElMessage.error(t('enhancedTopic.replyContentCannotBeEmpty'));
    return;
  }

  handleRequest(async () => {
    if (isAddContent.value) {
      const mentions = contentEditor.value?.getMentionBindings(draft) ?? [];
      const { content, bindings } = prepareReply(draft, mentions);
      const data = await createReply(props.topicId as string, content, bindings);
      createHistoryId = '';
      clearContent();
      ElMessage.success(t('enhancedTopic.replyContentIsUnderReview'));

      setTimeout(() => {
        generateCreateHistoryId();
      }, 300);

      closeEditor();
      emit('sended', data);
      return;
    }

    const content = convertWeiboEmojiToImg(draft);
    const data = await modifyReply(editedReplyId, content);
    ElMessage.success(t('enhancedTopic.editReplySuccessful'));

    closeEditor();
    emit('modified', data, editedReplyId);
  });
};

const storage = useStorageStore();
let createHistoryId = '';
let modifyHistoryId = '';

const editorHistoryType = computed<EditHistoryType>(() => {
  return isAddContent.value ? EditHistoryType.ReplyCreate : EditHistoryType.ReplyModify;
});

watch(replyContent, () => {
  updateEditHistory();
});

const generateCreateHistoryId = () => {
  const loginUserId = storage.settings?.loginUserId as string;
  createHistoryId = getReplyCreateHistoryId(loginUserId, props.topicId as string);
};

const generateModifyHistoryId = () => {
  const loginUserId = storage.settings?.loginUserId as string;
  modifyHistoryId = getReplyModifyHistoryId(loginUserId, props.topicId as string, editedReplyId);
};

const resetEditHistoryId = () => {
  createHistoryId = '';
  modifyHistoryId = '';
};

const updateEditHistory = debounce(() => {
  let editHistoryId = isAddContent.value ? createHistoryId : modifyHistoryId;

  if (editHistoryId) {
    saveEditHistory(editHistoryId, { content: replyContent.value });
  }
}, 200);

const importEditHistory = (data: EditHistoryItem) => {
  const { content } = data;

  if (isAddContent.value) {
    createHistoryId = '';
  } else {
    modifyHistoryId = '';
  }

  if (content !== undefined) {
    contentEditor.value?.setValue(content);
  }

  setTimeout(() => {
    if (isAddContent.value) {
      generateCreateHistoryId();
    } else {
      generateModifyHistoryId();
    }
  }, 300);
};

defineExpose({
  openEditor,
  closeEditor,
  resetEditorLayout,
  generateCreateHistoryId,
  resetEditHistoryId,
  addReply,
  editReply,
  clearContent,
  isEmojiPickerVisible,
  dismissSelectPicker,
});
</script>

<template>
  <div v-show="editorVisible" :class="['gzkp-reply-editor-container', editorFullscreenClass]" :style="editorStyle">
    <div class="gzkp-reply-editor-header">{{ editorTitle }}</div>
    <div class="gzkp-reply-editor-body">
      <ContentEditor
        ref="contentEditor"
        v-model="replyContent"
        mentionable
        :placeholder="$t('enhancedTopic.replyContent')"
        :editor-history-type="editorHistoryType"
        @import-history="importEditHistory"
        @submit-content="sendReply"
        @show-emoji-picker="emojiPicker?.showPicker"
        @show-mention-picker="showMentionPicker"
        @show-weibo-emoji-picker="showWeiboEmojiPicker"
        @toggle-fullscreen="$emit('toggleFullscreen')"
      />
      <MentionPicker
        ref="mentionPicker"
        :style="mentionPickerStyle"
        :users="topicMentionUsers"
        @picked="pickMention"
        @hide="contentEditor?.focusEditor"
      />
      <WeiboEmojiPicker
        ref="weiboEmojiPicker"
        :style="weiboEmojiPickerStyle"
        @picked="insertWeiboEmoji"
        @hide="contentEditor?.focusEditor"
      />
    </div>
    <div class="gzkp-reply-editor-footer">
      <EmojiPicker ref="emojiPicker" @select="insertEmoji" />
      <span>
        <ElButton @click="closeEditor">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="isLoading" @click="sendReply">{{ $t('common.post') }}</ElButton>
      </span>
    </div>
  </div>
</template>

<style lang="scss">
.gzkp-reply-editor-container {
  display: flex;
  flex-direction: column;
  padding: var(--gzkp-topic-padding);
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom-right-radius: var(--el-border-radius-base);
  border-bottom-left-radius: var(--el-border-radius-base);
}

.gzkp-reply-editor-header {
  font-size: var(--el-font-size-large);
  line-height: var(--el-font-line-height-primary);
  color: var(--el-text-color-primary);
}

.gzkp-reply-editor-body {
  flex: 1;
  margin: var(--gzkp-topic-padding) 0;
  overflow: hidden;
}

.gzkp-reply-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
