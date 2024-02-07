<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { useContentEditor } from '@/composables/content-editor';
import { useDialog } from '@/composables/dialog';
import { useDialogFullscreen } from '@/composables/dialog-fullscreen';
import { useRequest } from '@/composables/request';
import { t } from '@/i18n';
import { createReply, modifyReply } from '@/api';
import { convertWeiboEmojiToImg, convertWeiboImgToEmoji } from '@/utils/emoji';

import ContentEditor from './ContentEditor.vue';
import EmojiPicker from './EmojiPicker.vue';
import MentionPicker from './MentionPicker.vue';

import type { UserReplyItem, UserTopic } from '@/types';

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

const handleDialogClosed = () => {
  if (!isAddContent.value) {
    clearContent();
  }

  resetDialogFullscreen();
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
    @opened="contentEditor?.focusEndOfEditor"
    @closed="handleDialogClosed"
  >
    <ContentEditor
      ref="contentEditor"
      v-model="replyContent"
      mentionable
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
      <ElButton type="primary" :loading="isLoading" @click="sendReply">{{ $t('common.post') }}</ElButton>
    </template>
  </ElDialog>
</template>

<style lang="scss">
.reply-editor-dialog {
  height: 400px;
}
</style>
