<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { debounce } from 'lodash-es';

import { useClickModal } from '@/composables/click-modal';
import { useDialogFullscreen } from '@/composables/dialog-fullscreen';
import { useLockscreen } from '@/composables/lockscreen';
import { useRequest } from '@/composables/request';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { createTopic, getNodeList, modifyTopic } from '@/api';
import { isGlobalLoadingVisible } from '@/utils';
import {
  EditHistoryType,
  getTopicCreateHistoryId,
  getTopicModifyHistoryId,
  saveEditHistory,
} from '@/utils/edit-history';
import { convertWeiboEmojiToImg, convertWeiboImgToEmoji } from '@/utils/emoji';
import { DialogType } from '@/constants';

import TopicEditorPanel from './TopicEditorPanel.vue';

import type { CascaderProps, DialogBeforeCloseFn } from 'element-plus';
import type { EditHistoryItem, TopicForm, TreeNode, UserTopic, UserTopicDetail } from '@/types';

interface Props {
  inlineTarget?: HTMLElement | null;
}

defineProps<Props>();

const emit = defineEmits<{
  sended: [data: UserTopic];
  editModeChange: [editing: boolean];
  editFullscreenChange: [fullscreen: boolean];
}>();

let editedTopicId: string;

const topicForm = reactive<TopicForm>({
  node: '',
  title: '',
  content: '',
});
const isAddContent = ref(true);
const editorVisible = ref(false);
const { lockScroll, unlockScroll } = useLockscreen();
const { closeOnClickModal } = useClickModal(DialogType.TopicEditor);
const editorPanel = ref<InstanceType<typeof TopicEditorPanel> | null>(null);
const {
  dialogFullscreen,
  dialogFullscreenClass,
  dialogFullscreenStyle,
  toggleDialogFullscreen,
  resetDialogFullscreen,
} = useDialogFullscreen(() => {
  nextTick(() => {
    editorPanel.value?.refreshEditor();
  });
});
const nodeList = ref<TreeNode[]>([]);

const cascaderProps: CascaderProps = {
  expandTrigger: 'hover',
  emitPath: false,
};

const editorTitle = computed(() => {
  return isAddContent.value ? t('enhancedTopic.createTopic') : t('enhancedTopic.editTopic');
});

const showEmbeddedEditor = computed(() => {
  return editorVisible.value && !isAddContent.value;
});

const showEditorDialog = computed(() => {
  return editorVisible.value && isAddContent.value;
});

const prepareEditorPanel = () => {
  nextTick(() => {
    editorPanel.value?.prepareEditor();
    editorPanel.value?.focusTitle();
  });
};

const openCreateEditor = async (node: string) => {
  if (editorVisible.value) {
    closeEditor();
  }

  isAddContent.value = true;
  topicForm.node = node;
  topicForm.title = '';
  topicForm.content = '';
  resetDialogFullscreen();
  editorVisible.value = true;

  lockScroll();
  generateEditHistoryId();
  prepareEditorPanel();

  if (!nodeList.value.length) {
    nodeList.value = await getNodeList();
  }
};

const openEditEditor = (topicId: string, topicDetail: UserTopicDetail) => {
  if (editorVisible.value) {
    closeEditor();
  }

  isAddContent.value = false;
  editedTopicId = topicId;
  editHistoryId = '';
  resetDialogFullscreen();
  topicForm.title = topicDetail.title as string;
  topicForm.content = convertWeiboImgToEmoji(topicDetail.content as string);
  editorVisible.value = true;
  emit('editModeChange', true);

  setTimeout(() => {
    generateEditHistoryId();
  }, 300);

  prepareEditorPanel();
};

const { isLoading, handleRequest } = useRequest();

const sendTopic = async () => {
  const valid = await editorPanel.value?.validate();

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

    closeEditor();
  });
};

const closeEditor = () => {
  if (!editorVisible.value) {
    return;
  }

  const wasAddContent = isAddContent.value;
  editorPanel.value?.hideAllSubMenu();
  editorVisible.value = false;
  editHistoryId = '';

  if (wasAddContent) {
    unlockScroll();
  } else {
    emit('editModeChange', false);
    emit('editFullscreenChange', false);
  }

  topicForm.node = '';
  topicForm.title = '';
  topicForm.content = '';
  resetDialogFullscreen();
};

const handleEditorBeforeClose: DialogBeforeCloseFn = (done) => {
  if (isGlobalLoadingVisible() || editorPanel.value?.isEmojiPickerVisible()) {
    return;
  }

  done();
};

const handleToggleFullscreen = () => {
  toggleDialogFullscreen();

  if (!isAddContent.value) {
    emit('editFullscreenChange', dialogFullscreen.value);
  }
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

const generateEditHistoryId = () => {
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
  editHistoryId = '';

  if (title !== undefined) {
    topicForm.title = title;
  }

  if (content !== undefined) {
    topicForm.content = content;
    editorPanel.value?.setContent(content);
  }

  setTimeout(() => {
    editHistoryId = id;
  }, 100);
};

defineExpose({
  openCreateEditor,
  openEditEditor,
  closeEditor,
  isEmojiPickerVisible: () => editorPanel.value?.isEmojiPickerVisible(),
});
</script>

<template>
  <Teleport v-if="showEmbeddedEditor && inlineTarget" :to="inlineTarget">
    <div :class="['topic-editor-container', dialogFullscreenClass]">
      <TopicEditorPanel
        ref="editorPanel"
        v-model:title="topicForm.title"
        v-model:content="topicForm.content"
        :editor-title="editorTitle"
        :editor-history-type="editorHistoryType"
        :loading="isLoading"
        show-header
        @close="closeEditor"
        @submit="sendTopic"
        @import-history="importEditHistory"
        @toggle-fullscreen="handleToggleFullscreen"
      />
    </div>
  </Teleport>
  <ElDialog
    v-if="showEditorDialog"
    :model-value="showEditorDialog"
    :class="['editor-dialog', 'topic-editor-dialog', dialogFullscreenClass]"
    :style="dialogFullscreenStyle"
    :modal-class="isAddContent ? 'gzk-dialog-overlay' : ''"
    :lock-scroll="false"
    :z-index="2001"
    :before-close="handleEditorBeforeClose"
    :close-on-click-modal="closeOnClickModal"
    
     align-center append-to-body 
    @update:model-value="!$event && closeEditor()"
    @opened="editorPanel?.focusTitle"
  >
    <template #header="{ titleId, titleClass }">
      <div class="topic-editor-header">
        <span :id="titleId" :class="titleClass">{{ editorTitle }}</span>
        <ElCascader
          v-if="isAddContent"
          v-model="topicForm.node"
          :options="nodeList"
          :props="cascaderProps"
          size="large"
        />
      </div>
    </template>
    <TopicEditorPanel
      ref="editorPanel"
      v-model:title="topicForm.title"
      v-model:content="topicForm.content"
      :editor-title="editorTitle"
      :editor-history-type="editorHistoryType"
      :loading="isLoading"
      @close="closeEditor"
      @submit="sendTopic"
      @import-history="importEditHistory"
      @toggle-fullscreen="handleToggleFullscreen"
    />
  </ElDialog>
</template>

<style lang="scss">
.topic-editor-dialog {
  height: 540px;

  .el-dialog__body {
    padding-bottom: var(--gzk-topic-padding);
  }
}

.topic-editor-container {
  height: 100%;
  padding: var(--gzk-topic-padding);
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
