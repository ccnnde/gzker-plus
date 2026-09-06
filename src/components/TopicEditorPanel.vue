<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElInput } from 'element-plus';

import { useContentEditor } from '@/composables/content-editor';
import { t } from '@/i18n';
import type { EditHistoryType } from '@/utils/edit-history';

import ContentEditor from './ContentEditor.vue';
import EmojiPicker from './EmojiPicker.vue';
import WeiboEmojiPicker from './WeiboEmojiPicker.vue';

import type { FormInstance, FormRules } from 'element-plus';
import type { EditHistoryItem, TopicForm } from '@/types';

interface Props {
  editorTitle: string;
  editorHistoryType: EditHistoryType;
  loading: boolean;
  showHeader?: boolean;
}

withDefaults(defineProps<Props>(), {
  showHeader: false,
});

const emit = defineEmits<{
  close: [];
  submit: [];
  importHistory: [data: EditHistoryItem];
  toggleFullscreen: [];
}>();
const title = defineModel<string>('title', { required: true });
const content = defineModel<string>('content', { required: true });

const topicFormRef = ref<FormInstance>();
const titleInput = ref<InstanceType<typeof ElInput> | null>(null);
const topicForm = computed<TopicForm>(() => {
  return {
    node: '',
    title: title.value,
    content: content.value,
  };
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
  contentEditor,
  emojiPicker,
  weiboEmojiPicker,
  weiboEmojiPickerStyle,
  insertEmoji,
  insertWeiboEmoji,
  refreshEditor,
  resetEditorLayout,
  showWeiboEmojiPicker,
  isEmojiPickerVisible,
} = useContentEditor();

const validateContentField = async () => {
  try {
    await topicFormRef.value?.validateField('content');
  } catch (err) {
    console.warn(err);
  }
};

const validate = async () => {
  try {
    await topicFormRef.value?.validate();
    return true;
  } catch {
    return false;
  }
};

const prepareEditor = () => {
  resetEditorLayout();
  topicFormRef.value?.clearValidate();
};

const focusTitle = () => {
  titleInput.value?.focus();
};

const hideAllSubMenu = () => {
  contentEditor.value?.hideAllSubMenu();
};

const setContent = (value: string) => {
  contentEditor.value?.setValue(value);
};

defineExpose({
  validate,
  prepareEditor,
  focusTitle,
  refreshEditor,
  hideAllSubMenu,
  setContent,
  isEmojiPickerVisible,
});
</script>

<template>
  <div class="topic-editor-panel-container">
    <div v-if="showHeader" class="topic-editor-panel-header">
      <span>{{ editorTitle }}</span>
      <button class="topic-editor-panel-close" type="button" :aria-label="$t('common.cancel')" @click="emit('close')">
        <un-i-mdi-close />
      </button>
    </div>
    <ElForm
      ref="topicFormRef"
      class="topic-editor-panel-form"
      :model="topicForm"
      :rules="topicRules"
      size="large"
      hide-required-asterisk
    >
      <ElFormItem prop="title">
        <ElInput ref="titleInput" v-model="title" :placeholder="$t('enhancedTopic.topicTitle')" />
      </ElFormItem>
      <ElFormItem class="topic-editor-panel-content" prop="content">
        <ContentEditor
          ref="contentEditor"
          v-model="content"
          :mentionable="false"
          :editor-history-type="editorHistoryType"
          @blur="validateContentField"
          @change="validateContentField"
          @import-history="emit('importHistory', $event)"
          @submit-content="emit('submit')"
          @show-emoji-picker="emojiPicker?.showPicker"
          @show-weibo-emoji-picker="showWeiboEmojiPicker"
          @toggle-fullscreen="emit('toggleFullscreen')"
        />
      </ElFormItem>
    </ElForm>
    <WeiboEmojiPicker
      ref="weiboEmojiPicker"
      :style="weiboEmojiPickerStyle"
      @picked="insertWeiboEmoji"
      @hide="contentEditor?.focusEditor"
    />
    <div class="topic-editor-panel-footer">
      <EmojiPicker ref="emojiPicker" @select="insertEmoji" />
      <span>
        <ElButton @click="emit('close')">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="loading" @click="emit('submit')">{{ $t('common.post') }}</ElButton>
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.topic-editor-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.topic-editor-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--gzk-topic-padding);
  font-size: var(--el-font-size-large);
  line-height: var(--el-font-line-height-primary);
  color: var(--el-text-color-primary);
}

.topic-editor-panel-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: var(--el-message-close-size, 16px);
  color: var(--el-color-info);
  cursor: pointer;
  background: transparent;
  border: 0;
  outline: none;

  &:hover,
  &:focus-visible {
    color: var(--el-color-primary);
  }
}

.topic-editor-panel-form {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.topic-editor-panel-content {
  flex: 1;
  padding-bottom: 22px;
  margin-bottom: 0;
  overflow: hidden;

  &.is-error :deep(.cherry) {
    background-color: var(--el-color-danger);
    border-color: var(--el-color-danger);
  }
}

.topic-editor-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
