<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { debounce } from 'lodash-es';

import { useContentEditor } from '@/composables/content-editor';
import { useDialog } from '@/composables/dialog';
import { useDialogFullscreen } from '@/composables/dialog-fullscreen';
import { useRequest } from '@/composables/request';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { createReply, modifyReply } from '@/api';
import {
  EditHistoryType,
  getReplyCreateHistoryId,
  getReplyModifyHistoryId,
  saveEditHistory,
} from '@/utils/edit-history';
import { convertWeiboEmojiToImg, convertWeiboImgToEmoji } from '@/utils/emoji';

import ContentEditor from './ContentEditor.vue';
import EmojiPicker from './EmojiPicker.vue';
import MentionPicker from './MentionPicker.vue';

import type { EditHistoryItem, UserReplyItem, UserTopic } from '@/types';

interface Props {
  topicId?: string;
  replyList: UserReplyItem[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  sended: [data: UserTopic];
}>();

let editedReplyId: string;

const replyContent = ref('');
const {
  isAddContent,
  contentEditor,
  emojiPicker,
  mentionPicker,
  mentionPickerStyle,
  insertUid,
  insertEmoji,
  clearContent,
  refreshEditor,
  resetEditorLayout,
  showMentionPicker,
  handleEditorBeforeClose,
} = useContentEditor();
const { dialogVisible, openDialog, closeDialog } = useDialog();
const {
  dialogFullscreen,
  dialogFullscreenClass,
  dialogFullscreenStyle,
  toggleDialogFullscreen,
  resetDialogFullscreen,
} = useDialogFullscreen(refreshEditor);

const editorTitle = computed(() => {
  return isAddContent.value ? t('enhancedTopic.createReply') : t('enhancedTopic.editReply');
});

const uidList = computed(() => {
  let replyUids = props.replyList.map((item) => item.uid as string);
  replyUids = [...new Set(replyUids)];
  return replyUids;
});

const addReply = (content?: string) => {
  isAddContent.value = true;

  if (!content) {
    return;
  }

  setTimeout(() => {
    const newLine = replyContent.value ? '\n' : '';
    contentEditor.value?.appendValue(newLine + content);
  }, 0);
};

const editReply = (reply: UserReplyItem) => {
  isAddContent.value = false;
  editedReplyId = reply.replyId as string;

  setTimeout(() => {
    const content = convertWeiboImgToEmoji(reply.content as string);
    contentEditor.value?.setValue(content);
  }, 0);

  setTimeout(() => {
    generateEditHisotryId();
  }, 300);
};

const { isLoading, handleRequest } = useRequest();

const sendReply = () => {
  if (!replyContent.value) {
    ElMessage.error(t('enhancedTopic.replyContentCannotBeEmpty'));
    return;
  }

  handleRequest(async () => {
    const content = convertWeiboEmojiToImg(replyContent.value);
    let data;

    if (isAddContent.value) {
      data = await createReply(props.topicId as string, content);
      clearContent();
      ElMessage.success(t('enhancedTopic.replyContentIsUnderReview'));
    } else {
      data = await modifyReply(editedReplyId, content);
      ElMessage.success(t('enhancedTopic.editReplySuccessful'));
    }

    closeDialog();
    emit('sended', data);
  });
};

const handleDialogOpen = () => {
  resetEditorLayout();

  if (isAddContent.value) {
    generateEditHisotryId();
  }

  contentEditor.value?.focusEndOfEditor();
};

const handleDialogClose = () => {
  editHistoryId = '';

  if (!isAddContent.value) {
    clearContent();
  }

  contentEditor.value?.hideAllSubMenu();
};

const handleDialogClosed = () => {
  resetDialogFullscreen();
};

const storage = useStorageStore();
let editHistoryId = '';

const editorHistoryType = computed<EditHistoryType>(() => {
  return isAddContent.value ? EditHistoryType.ReplyCreate : EditHistoryType.ReplyModify;
});

watch(replyContent, () => {
  if (!editHistoryId) {
    return;
  }

  updateEditHistory();
});

const generateEditHisotryId = () => {
  const loginUserId = storage.settings?.loginUserId as string;

  if (isAddContent.value) {
    editHistoryId = getReplyCreateHistoryId(loginUserId, props.topicId as string);
  } else {
    editHistoryId = getReplyModifyHistoryId(loginUserId, props.topicId as string, editedReplyId);
  }
};

const updateEditHistory = debounce(() => {
  saveEditHistory(editHistoryId, { content: replyContent.value });
}, 200);

const importEditHistory = (data: EditHistoryItem) => {
  const { id, content } = data;
  editHistoryId = '';

  if (content !== undefined) {
    contentEditor.value?.setValue(content);
  }

  setTimeout(() => {
    editHistoryId = id;
  }, 100);
};

defineExpose({
  openDialog,
  addReply,
  editReply,
  clearContent,
});
</script>

<template>
  <ElDialog
    v-model="dialogVisible"
    :class="['editor-dialog', 'reply-editor-dialog', dialogFullscreenClass]"
    :style="dialogFullscreenStyle"
    :title="editorTitle"
    :align-center="dialogFullscreen"
    :lock-scroll="false"
    :z-index="2001"
    :before-close="handleEditorBeforeClose"
    :close-on-click-modal="false"
    append-to-body
    @open="handleDialogOpen"
    @opened="contentEditor?.focusEditor"
    @close="handleDialogClose"
    @closed="handleDialogClosed"
  >
    <ContentEditor
      ref="contentEditor"
      v-model="replyContent"
      mentionable
      :editor-history-type="editorHistoryType"
      @import-history="importEditHistory"
      @submit-content="sendReply"
      @show-emoji-picker="emojiPicker?.showPicker"
      @show-mention-picker="showMentionPicker"
      @toggle-fullscreen="toggleDialogFullscreen"
    />
    <MentionPicker
      ref="mentionPicker"
      :style="mentionPickerStyle"
      :uid-list="uidList"
      @picked="insertUid"
      @hide="contentEditor?.focusEditor"
    />
    <template #footer>
      <EmojiPicker ref="emojiPicker" @select="insertEmoji" />
      <span>
        <ElButton @click="closeDialog">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="isLoading" @click="sendReply">{{ $t('common.post') }}</ElButton>
      </span>
    </template>
  </ElDialog>
</template>

<style lang="scss">
.reply-editor-dialog {
  height: 400px;
}
</style>
