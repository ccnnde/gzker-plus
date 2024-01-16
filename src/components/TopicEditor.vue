<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElInput, ElMessage } from 'element-plus';

import { useContentEditor } from '@/composables/content-editor';
import { useDialog } from '@/composables/dialog';
import { useRequest } from '@/composables/request';
import { t } from '@/i18n';
import { createTopic, getNodeList, modifyTopic } from '@/api';
import { convertWeiboEmojiToImg, convertWeiboImgToEmoji } from '@/utils/emoji';

import ContentEditor from './ContentEditor.vue';
import EmojiPicker from './EmojiPicker.vue';

import type { CascaderProps, FormInstance, FormRules } from 'element-plus';
import type { TreeNode, UserTopic, UserTopicDetail } from '@/types';

interface TopicForm {
  node: string;
  title: string;
  content: string;
}

const emit = defineEmits<{
  sended: [data: UserTopic];
}>();

let editedTopicId: string;

const topicFormRef = ref<FormInstance>();
const topicForm = reactive<TopicForm>({
  node: '',
  title: '',
  content: '',
});

const topicRules = computed<FormRules<TopicForm>>(() => {
  return {
    title: [
      {
        required: true,
        message: t('enhancedTopic.topicTitleCannotBeEmpty'),
        trigger: 'blur',
      },
      {
        min: 3,
        max: 56,
        message: t('enhancedTopic.topicTitleLengthLimit'),
        trigger: 'blur',
      },
    ],
    content: [
      {
        required: true,
        message: t('enhancedTopic.topicContentCannotBeEmpty'),
        trigger: 'blur',
      },
    ],
  };
});

const { dialogVisible, openDialog, closeDialog } = useDialog();
const { isAddContent, contentEditor, emojiPicker, insertEmoji, clearContent } = useContentEditor();
const titleInput = ref<InstanceType<typeof ElInput> | null>(null);
const nodeList = ref<TreeNode[]>([]);

const cascaderProps: CascaderProps = {
  expandTrigger: 'hover',
  emitPath: false,
};

const editorTitle = computed(() => {
  return isAddContent.value ? t('enhancedTopic.createTopic') : t('enhancedTopic.editTopic');
});

onMounted(async () => {
  nodeList.value = await getNodeList();
});

const addTopic = (node: string) => {
  isAddContent.value = true;
  topicForm.node = node;
};

const editTopic = (topicId: string, topicDetail: UserTopicDetail) => {
  isAddContent.value = false;
  editedTopicId = topicId;
  topicForm.title = topicDetail.title as string;

  setTimeout(() => {
    const content = convertWeiboImgToEmoji(topicDetail.content as string);
    contentEditor.value?.setValue(content);
  }, 0);
};

const { isLoading, handleRequest } = useRequest();

const sendTopic = () => {
  topicFormRef.value?.validate((valid) => {
    if (!valid) {
      return;
    }

    handleRequest(async () => {
      const content = convertWeiboEmojiToImg(topicForm.content);

      if (isAddContent.value) {
        await createTopic(topicForm.node, topicForm.title, content);

        ElMessage.success({
          message: t('enhancedTopic.topicContentIsUnderReview'),
          onClose: () => window.location.reload(),
        });
      } else {
        const data = await modifyTopic(editedTopicId, topicForm.title, content);
        emit('sended', data);
        ElMessage.success(t('enhancedTopic.editTopicSuccessful'));
      }

      closeDialog();
    });
  });
};

const handleDialogClosed = () => {
  topicForm.node = '';
  topicForm.title = '';
  topicFormRef.value?.clearValidate();
  clearContent();
};

defineExpose({
  openDialog,
  addTopic,
  editTopic,
});
</script>

<template>
  <ElDialog
    v-model="dialogVisible"
    class="editor-dialog topic-editor-dialog"
    :z-index="2001"
    append-to-body
    @opened="titleInput?.focus"
    @closed="handleDialogClosed"
  >
    <template #header="{ titleId, titleClass }">
      <div class="topic-editor-header">
        <span :id="titleId" :class="titleClass">{{ editorTitle }}</span>
        <template v-if="isAddContent">
          <ElCascader v-model="topicForm.node" :options="nodeList" :props="cascaderProps" size="large" />
        </template>
      </div>
    </template>
    <ElForm ref="topicFormRef" :model="topicForm" :rules="topicRules" size="large" hide-required-asterisk>
      <ElFormItem prop="title">
        <ElInput ref="titleInput" v-model="topicForm.title" :placeholder="$t('enhancedTopic.topicTitle')" />
      </ElFormItem>
      <ElFormItem prop="content">
        <ContentEditor ref="contentEditor" v-model="topicForm.content" :height="300" @show-emoji-picker="emojiPicker?.showPicker" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <EmojiPicker ref="emojiPicker" @select="insertEmoji" />
      <ElButton type="primary" :loading="isLoading" @click="sendTopic">{{ $t('common.post') }}</ElButton>
    </template>
  </ElDialog>
</template>

<style lang="scss">
.topic-editor-dialog {
  .el-dialog__footer {
    padding-top: 0;
  }
}
</style>

<style lang="scss" scoped>
.topic-editor-header {
  display: flex;
  align-items: center;

  & > span {
    margin-right: 10px;
  }

  :deep(.el-cascader) {
    .el-input__icon::before {
      display: none;
    }
  }
}
</style>
