<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElInput, ElMessage } from 'element-plus';
import { debounce } from 'lodash-es';

import { useContentEditor } from '@/composables/content-editor';
import { useDialog } from '@/composables/dialog';
import { useDialogFullscreen } from '@/composables/dialog-fullscreen';
import { useLockscreen } from '@/composables/lockscreen';
import { useRequest } from '@/composables/request';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { createTopic, getNodeList, modifyTopic } from '@/api';
import {
  EditHistoryType,
  getTopicCreateHistoryId,
  getTopicModifyHistoryId,
  saveEditHistory,
} from '@/utils/edit-history';
import { convertWeiboEmojiToImg, convertWeiboImgToEmoji } from '@/utils/emoji';

import ContentEditor from './ContentEditor.vue';
import EmojiPicker from './EmojiPicker.vue';

import type { CascaderProps, FormInstance, FormRules } from 'element-plus';
import type { EditHistoryItem, TopicForm, TreeNode, UserTopic, UserTopicDetail } from '@/types';

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
      },
      {
        min: 3,
        max: 56,
        message: t('enhancedTopic.topicTitleLengthLimit'),
      },
    ],
    content: [
      {
        required: true,
        message: t('enhancedTopic.topicContentCannotBeEmpty'),
      },
    ],
  };
});

const {
  isAddContent,
  contentEditor,
  emojiPicker,
  insertEmoji,
  clearContent,
  refreshEditor,
  resetEditorLayout,
  handleEditorBeforeClose,
} = useContentEditor();
const { lockScroll, unlockScroll } = useLockscreen();
const { dialogVisible, openDialog, closeDialog } = useDialog();
const {
  dialogFullscreen,
  dialogFullscreenClass,
  dialogFullscreenStyle,
  toggleDialogFullscreen,
  resetDialogFullscreen,
} = useDialogFullscreen(refreshEditor);
const titleInput = ref<InstanceType<typeof ElInput> | null>(null);
const nodeList = ref<TreeNode[]>([]);

const cascaderProps: CascaderProps = {
  expandTrigger: 'hover',
  emitPath: false,
};

const editorTitle = computed(() => {
  return isAddContent.value ? t('enhancedTopic.createTopic') : t('enhancedTopic.editTopic');
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

const validateContentField = async () => {
  try {
    await topicFormRef.value?.validateField('content');
  } catch (err) {
    console.warn(err);
  }
};

const handleDialogOpen = async () => {
  resetEditorLayout();
  generateEditHisotryId();
  topicFormRef.value?.clearValidate();

  if (isAddContent.value) {
    lockScroll();

    if (!nodeList.value.length) {
      nodeList.value = await getNodeList();
    }
  }
};

const handleDialogClose = () => {
  editHistoryId = '';
  clearContent();

  if (isAddContent.value) {
    unlockScroll();
  }
};

const handleDialogClosed = () => {
  topicForm.node = '';
  topicForm.title = '';
  resetDialogFullscreen();
};

const storage = useStorageStore();
let editHistoryId = '';

const editorHistoryType = computed<EditHistoryType>(() => {
  return isAddContent.value ? EditHistoryType.TopicCreate : EditHistoryType.TopicModify;
});

watch(topicForm, () => {
  if (!editHistoryId) {
    return;
  }

  updateEditHistory();
});

const generateEditHisotryId = () => {
  const loginUserId = storage.settings?.loginUserId as string;

  if (isAddContent.value) {
    editHistoryId = getTopicCreateHistoryId(loginUserId);
  } else {
    editHistoryId = getTopicModifyHistoryId(loginUserId, editedTopicId);
  }
};

const updateEditHistory = debounce(() => {
  saveEditHistory(editHistoryId, topicForm);
}, 200);

const importEditHistory = (data: EditHistoryItem) => {
  const { id, title, content } = data;
  editHistoryId = id;

  if (title !== undefined) {
    topicForm.title = title;
  }

  if (content !== undefined) {
    contentEditor.value?.setValue(content);
  }
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
    :class="['editor-dialog', 'topic-editor-dialog', dialogFullscreenClass]"
    :style="dialogFullscreenStyle"
    :align-center="dialogFullscreen"
    :lock-scroll="false"
    :z-index="2001"
    :before-close="handleEditorBeforeClose"
    :close-on-click-modal="false"
    append-to-body
    @open="handleDialogOpen"
    @opened="titleInput?.focus"
    @close="handleDialogClose"
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
    <ElForm
      ref="topicFormRef"
      class="topic-editor-form"
      :model="topicForm"
      :rules="topicRules"
      size="large"
      hide-required-asterisk
    >
      <ElFormItem prop="title">
        <ElInput ref="titleInput" v-model="topicForm.title" :placeholder="$t('enhancedTopic.topicTitle')" />
      </ElFormItem>
      <ElFormItem class="topic-form-content" prop="content">
        <ContentEditor
          ref="contentEditor"
          v-model="topicForm.content"
          :mentionable="false"
          :editor-history-type="editorHistoryType"
          @blur="validateContentField"
          @change="validateContentField"
          @import-history="importEditHistory"
          @submit-content="sendTopic"
          @show-emoji-picker="emojiPicker?.showPicker"
          @toggle-fullscreen="toggleDialogFullscreen"
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <EmojiPicker ref="emojiPicker" @select="insertEmoji" />
      <span>
        <ElButton @click="closeDialog">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="isLoading" @click="sendTopic">{{ $t('common.post') }}</ElButton>
      </span>
    </template>
  </ElDialog>
</template>

<style lang="scss">
.topic-editor-dialog {
  height: 540px;

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

.topic-editor-form {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.topic-form-content {
  flex: 1;
  padding-bottom: 22px;
  margin-bottom: 0;
  overflow: hidden;

  &.is-error :deep(.cherry) {
    border-color: var(--el-color-danger);
  }
}
</style>
