<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';

import { useRequest } from '@/composables/request';
import { t } from '@/i18n';
import { createReply } from '@/api';

import ContentEditor from './ContentEditor.vue';

import type { UserTopic } from '@/types';

interface Props {
  topicId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  sended: [data: UserTopic];
}>();

const replyContent = ref('');
const replyDialogVisible = ref(false);
const contentEditor = ref<InstanceType<typeof ContentEditor> | null>(null);

const openDialog = () => {
  replyDialogVisible.value = true;
};

const insertReply = (content: string) => {
  setTimeout(() => {
    const newLine = replyContent.value ? '\n' : '';
    contentEditor.value?.insertValue(newLine + content);
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
    const data = await createReply(props.topicId as string, replyContent.value);

    replyDialogVisible.value = false;
    clearReply();
    emit('sended', data);

    ElMessage.success(t('enhancedTopic.replyContentIsUnderReview'));
  });
};

defineExpose({
  openDialog,
  insertReply,
  clearReply,
});
</script>

<template>
  <ElDialog
    v-model="replyDialogVisible"
    class="reply-dialog"
    :title="$t('enhancedTopic.createReply')"
    :z-index="2001"
    append-to-body
    @opened="contentEditor?.focusEditor()"
  >
    <ContentEditor ref="contentEditor" v-model="replyContent" :height="250" />
    <template #footer>
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
}
</style>
