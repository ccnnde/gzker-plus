<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ElInput } from 'element-plus';

import { useContentEditor } from '@/composables/content-editor';
import { t } from '@/i18n';
import type { EditHistoryType } from '@/utils/edit-history';
import { createPollDraft, getPollErrors } from '@/utils/topic-poll-editor';

import ContentEditor from './ContentEditor.vue';
import EmojiPicker from './EmojiPicker.vue';
import TopicPollEditor from './TopicPollEditor.vue';
import WeiboEmojiPicker from './WeiboEmojiPicker.vue';

import type { ElScrollbar, FormInstance, FormItemRule, FormRules } from 'element-plus';
import type { EditHistoryItem, TopicForm, TopicPollDraft } from '@/types';

interface Props {
  allowPoll?: boolean;
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
const poll = defineModel<TopicPollDraft>('poll');
const pollEditor = ref<InstanceType<typeof TopicPollEditor>>();
const pollButton = ref<HTMLButtonElement>();
const togglePoll = async () => {
  if (poll.value?.enabled) {
    removePoll();
    return;
  }

  if (poll.value) {
    poll.value.enabled = true;
  } else {
    poll.value = createPollDraft();
  }

  await nextTick();
  pollEditor.value?.focusQuestion();
};

const removePoll = () => {
  if (poll.value) {
    poll.value.enabled = false;
  }

  pollButton.value?.focus();
};

const topicFormRef = ref<FormInstance>();
const scrollbar = ref<InstanceType<typeof ElScrollbar>>();
const checkedPollFields = new Set<string>();

watch(
  () => {
    return poll.value?.enabled;
  },
  () => {
    clearValidation();
  },
);

const titleInput = ref<InstanceType<typeof ElInput> | null>(null);
const topicForm = computed<TopicForm>(() => {
  return {
    node: '',
    title: title.value,
    content: content.value,
    poll: poll.value,
  };
});

const pollRule = (field: string): FormItemRule => {
  return {
    validator: (_rule, _value, callback) => {
      const message = poll.value?.enabled ? getPollErrors(poll.value)[field] : undefined;
      callback(message ? new Error(message) : undefined);
    },
  };
};

const validatePollFields = async (fields: string[]) => {
  if (!fields.length || !poll.value?.enabled) {
    return;
  }

  const draft = poll.value;
  await nextTick();

  if (draft !== poll.value || !draft?.enabled) {
    return;
  }

  const paths = fields
    .filter((field) => {
      return checkedPollFields.has(field);
    })
    .map((field) => {
      return `poll.${field}`;
    });

  if (!paths.length) {
    return;
  }

  try {
    await topicFormRef.value?.validateField(paths);
  } catch {
    // 字段错误由 ElFormItem 显示，保留当前输入。
  }
};

const validatePollField = (field: string) => {
  const draft = poll.value;

  if (!draft?.enabled) {
    return;
  }

  const optionIndex = field.startsWith('options.') ? Number(field.split('.')[1]) : undefined;
  const value = optionIndex === undefined ? draft.question : draft.options[optionIndex];
  const isTextField = field === 'question' || optionIndex !== undefined;

  if (!checkedPollFields.has(field) && (!isTextField || !value?.trim())) {
    return;
  }

  checkedPollFields.add(field);
  validatePollFields([field]);
};

const removePollOption = (index: number) => {
  const fields = [...checkedPollFields];
  checkedPollFields.clear();

  for (const field of fields) {
    if (!field.startsWith('options.')) {
      checkedPollFields.add(field);
      continue;
    }

    const optionIndex = Number(field.split('.')[1]);

    if (optionIndex !== index) {
      checkedPollFields.add(`options.${optionIndex > index ? optionIndex - 1 : optionIndex}`);
    }
  }

  const optionPaths =
    topicFormRef.value?.fields
      .filter((field) => {
        return field.propString.startsWith('poll.options.');
      })
      .map((field) => {
        return field.propString;
      }) ?? [];
  topicFormRef.value?.clearValidate(optionPaths);
};

watch(
  () => {
    return poll.value;
  },
  async () => {
    clearValidation();
    await nextTick();
    clearValidation();
  },
);

watch(
  () => {
    return [poll.value, poll.value?.options.slice()] as const;
  },
  ([draft, options], [previousDraft, previousOptions]) => {
    if (draft !== previousDraft || !draft?.enabled || !options || !previousOptions) {
      return;
    }

    const fields = [...checkedPollFields].filter((field) => {
      return field.startsWith('options.') || field === 'options' || field === 'maxChoices';
    });
    validatePollFields(fields);
  },
);

watch(
  () => {
    const draft = poll.value;
    return [draft?.question, draft?.maxChoices, draft?.deadline, draft?.results];
  },
  (values, previousValues) => {
    const fields = ['question', 'maxChoices', 'deadline', 'results'].filter((field, index) => {
      return values[index] !== previousValues[index] && checkedPollFields.has(field);
    });
    validatePollFields(fields);
  },
);

const topicRules = computed<FormRules<TopicForm>>(() => {
  const pollRules: FormRules<TopicForm> = {};

  if (poll.value?.enabled) {
    for (const field of ['question', 'options', 'maxChoices', 'deadline', 'results']) {
      Object.assign(pollRules, {
        [`poll.${field}`]: [pollRule(field)],
      });
    }

    poll.value.options.forEach((_option, index) => {
      pollRules[`poll.options.${index}`] = [pollRule(`options.${index}`)];
    });
  }

  return {
    ...pollRules,
    title: [
      {
        required: !poll.value?.enabled,
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
        required: !poll.value?.enabled,
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

const focusFirstError = async () => {
  await nextTick();

  const scrollArea = scrollbar.value?.wrapRef;
  const errorField = scrollArea?.querySelector<HTMLElement>('.el-form-item.is-error');

  if (!scrollArea || !errorField) {
    return;
  }

  const controls = errorField.querySelectorAll<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), [contenteditable="true"], [role="combobox"][tabindex]:not([aria-disabled="true"])',
  );
  const control = [...controls].find((element) => {
    return element.getClientRects().length > 0;
  });
  control?.focus({ preventScroll: true });

  const field = control?.closest('.el-form-item') ?? errorField;
  const fieldRect = field.getBoundingClientRect();
  const errorRect = field.querySelector('.el-form-item__error')?.getBoundingClientRect();
  const scrollRect = scrollArea.getBoundingClientRect();
  const fieldBottom = Math.max(fieldRect.bottom, errorRect?.bottom ?? fieldRect.bottom);

  if (fieldRect.top < scrollRect.top || fieldBottom > scrollRect.bottom) {
    scrollbar.value?.scrollTo({
      top: scrollArea.scrollTop + fieldRect.top - scrollRect.top - 12,
      behavior: 'auto',
    });
  }
};

const validate = async () => {
  if (poll.value?.enabled) {
    for (const field of ['question', 'options', 'maxChoices', 'deadline', 'results']) {
      checkedPollFields.add(field);
    }

    poll.value.options.forEach((_option, index) => {
      checkedPollFields.add(`options.${index}`);
    });
  }

  await nextTick();

  try {
    return (await topicFormRef.value?.validate()) ?? false;
  } catch {
    await focusFirstError();
    return false;
  }
};

const clearValidation = () => {
  checkedPollFields.clear();
  topicFormRef.value?.clearValidate();
};

const prepareEditor = () => {
  resetEditorLayout();
  clearValidation();
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
  clearValidation,
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
    <ElScrollbar
      ref="scrollbar"
      class="topic-editor-panel-scrollbar"
      :view-style="{ height: poll?.enabled ? 'auto' : '100%' }"
    >
      <ElForm
        ref="topicFormRef"
        :class="['topic-editor-panel-form', { 'topic-editor-panel-poll-open': poll?.enabled }]"
        :model="topicForm"
        :rules="topicRules"
        :validate-on-rule-change="false"
        size="large"
        hide-required-asterisk
        @submit.prevent
      >
        <ElFormItem prop="title">
          <ElInput
            ref="titleInput"
            v-model="title"
            class="topic-editor-panel-title"
            :placeholder="poll?.enabled ? $t('enhancedTopic.pollEditor.optionalTitle') : $t('enhancedTopic.topicTitle')"
          />
        </ElFormItem>
        <ElFormItem class="topic-editor-panel-content" prop="content">
          <ContentEditor
            ref="contentEditor"
            v-model="content"
            :placeholder="poll?.enabled ? $t('enhancedTopic.pollEditor.optionalBody') : $t('enhancedTopic.topicBody')"
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
        <TopicPollEditor
          v-if="allowPoll && poll?.enabled"
          ref="pollEditor"
          v-model="poll"
          @remove="removePoll"
          @remove-option="removePollOption"
          @validate-field="validatePollField"
        />
      </ElForm>
    </ElScrollbar>
    <WeiboEmojiPicker
      ref="weiboEmojiPicker"
      :style="weiboEmojiPickerStyle"
      @picked="insertWeiboEmoji"
      @hide="contentEditor?.focusEditor"
    />
    <div :class="['topic-editor-panel-footer', { 'topic-editor-panel-footer-with-poll': poll?.enabled }]">
      <div class="topic-editor-panel-tools">
        <EmojiPicker ref="emojiPicker" @select="insertEmoji" />
        <button
          v-if="allowPoll"
          ref="pollButton"
          class="topic-editor-panel-poll-button"
          type="button"
          :title="$t('enhancedTopic.pollEditor.attach')"
          :aria-label="$t('enhancedTopic.pollEditor.attach')"
          :aria-pressed="!!poll?.enabled"
          @click="togglePoll"
        >
          <span class="i-gzkp-poll" aria-hidden="true"></span>
        </button>
      </div>
      <span>
        <ElButton @click="emit('close')">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="loading" @click="emit('submit')">{{ $t('common.post') }}</ElButton>
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/mixin';

.topic-editor-panel-tools {
  display: flex;
  gap: 8px;
  align-items: center;
}

.topic-editor-panel-poll-button {
  @include mixin.editor-action-icon;

  display: inline-flex;
  padding: 0;
  background: transparent;
  border: 0;
}

.topic-editor-panel-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.topic-editor-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--gzkp-topic-padding);
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
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-inline: var(--topic-editor-panel-inset, 0);
}

.topic-editor-panel-scrollbar {
  flex: 1;
  min-height: 0;
}

.topic-editor-panel-title {
  --el-input-text-color: var(--el-text-color-primary);
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

.topic-editor-panel-poll-open {
  height: auto;
  padding-bottom: 2px;

  .topic-editor-panel-content {
    flex: 0 0 180px;
  }
}

.topic-editor-panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: var(--topic-editor-panel-inset, 0);
}

.topic-editor-panel-footer-with-poll {
  padding-top: 12px;
}
</style>
