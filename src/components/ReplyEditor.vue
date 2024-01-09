<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { useRequest } from '@/composables/request';
import { t } from '@/i18n';
import { createReply, modifyReply } from '@/api';
import { convertWeiboEmojiToImg, convertWeiboImgToEmoji } from '@/utils/emoji';

import ContentEditor from './ContentEditor.vue';
import EmojiPicker from './EmojiPicker.vue';

import type { UserReplyItem, UserTopic } from '@/types';

interface Props {
  topicId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  sended: [data: UserTopic];
}>();

let editContentId: string;

const isEditContent = ref(false);
const replyContent = ref('');
const replyDialogVisible = ref(false);
const contentEditor = ref<InstanceType<typeof ContentEditor> | null>(null);
const emojiPicker = ref<InstanceType<typeof EmojiPicker> | null>(null);

const editorTitle = computed(() => {
  return isEditContent.value ? t('enhancedTopic.editReply') : t('enhancedTopic.createReply');
});

const openDialog = () => {
  replyDialogVisible.value = true;
};

const addReply = (content?: string) => {
  isEditContent.value = false;

  if (!content) {
    return;
  }

  setTimeout(() => {
    const newLine = replyContent.value ? '\n' : '';
    contentEditor.value?.appendValue(newLine + content);
  }, 0);
};

const editReply = (reply: UserReplyItem) => {
  isEditContent.value = true;
  editContentId = reply.replyId as string;

  setTimeout(() => {
    const content = convertWeiboImgToEmoji(reply.content as string);
    contentEditor.value?.setValue(content);
  }, 0);
};

const insertEmoji = (emoji: string) => {
  contentEditor.value?.insertValue(`:${emoji}:`);

  setTimeout(() => {
    contentEditor.value?.focusEditor();
  }, 0);
};

const clearReply = () => {
  contentEditor.value?.setValue('');
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

    if (isEditContent.value) {
      data = await modifyReply(editContentId, content);
      ElMessage.success(t('enhancedTopic.editReplySuccessful'));
    } else {
      data = await createReply(props.topicId as string, content);
      clearReply();
      ElMessage.success(t('enhancedTopic.replyContentIsUnderReview'));
    }

    replyDialogVisible.value = false;
    emit('sended', data);
  });
};

const handleDialogClosed = () => {
  if (isEditContent.value) {
    clearReply();
  }
};

defineExpose({
  openDialog,
  addReply,
  editReply,
  clearReply,
});
</script>

<template>
  <ElDialog
    v-model="replyDialogVisible"
    class="reply-dialog"
    :title="editorTitle"
    :z-index="2001"
    append-to-body
    @opened="contentEditor?.focusEndOfEditor()"
    @closed="handleDialogClosed"
  >
    <ContentEditor ref="contentEditor" v-model="replyContent" :height="250" @show-emoji-picker="emojiPicker?.showPicker" />
    <template #footer>
      <EmojiPicker ref="emojiPicker" @select="insertEmoji" />
      <ElButton type="primary" :loading="isLoading" @click="sendReply">{{ $t('common.post') }}</ElButton>
    </template>
  </ElDialog>
</template>

<style lang="scss">
.reply-dialog {
  .el-dialog__body {
    padding-top: var(--gzk-topic-padding);
    padding-bottom: var(--gzk-topic-padding);
  }

  .el-dialog__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
