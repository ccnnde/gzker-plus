<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { useEventListener } from '@vueuse/core';

import {
  MAX_POLL_DURATION_MS,
  MAX_POLL_OPTION_LENGTH,
  MAX_POLL_OPTIONS,
  MAX_POLL_QUESTION_LENGTH,
  MIN_POLL_DURATION_MS,
  MIN_POLL_OPTIONS,
} from '@/utils/topic-poll-editor';

import type { DatePickerInstance, ElFormItem, ElInput, ElSelect } from 'element-plus';
import type { TopicPollDraft } from '@/types';

const emit = defineEmits<{
  remove: [];
  removeOption: [index: number];
  validateField: [field: string];
}>();
const poll = defineModel<TopicPollDraft>({ required: true });
const questionInput = ref<InstanceType<typeof ElInput>>();
const pollRoot = ref<HTMLElement>();
const deadlineField = ref<InstanceType<typeof ElFormItem>>();
const deadlinePicker = ref<DatePickerInstance>();
const datePickerVisible = ref(false);
const maxChoicesSelect = ref<InstanceType<typeof ElSelect>>();
const resultsSelect = ref<InstanceType<typeof ElSelect>>();
const maxChoicesVisible = ref(false);
const resultsVisible = ref(false);
const popperOptions = {
  strategy: 'fixed' as const,
  modifiers: [
    {
      name: 'flip',
      enabled: false,
    },
    {
      name: 'preventOverflow',
      options: {
        rootBoundary: 'viewport',
        padding: 8,
        tether: false,
        altAxis: true,
      },
    },
  ],
};

useEventListener(
  () => {
    return pollRoot.value?.closest('.el-scrollbar__wrap');
  },
  'scroll',
  () => {
    const scrollArea = pollRoot.value?.closest('.el-scrollbar__wrap');

    if (!scrollArea) {
      return;
    }

    const scrollRect = scrollArea.getBoundingClientRect();
    const pickers = [
      {
        visible: datePickerVisible.value,
        element: deadlineField.value?.$el as HTMLElement | undefined,
        close: () => {
          deadlinePicker.value?.handleClose();
        },
      },
      {
        visible: maxChoicesVisible.value,
        element: maxChoicesSelect.value?.$el as HTMLElement | undefined,
        close: () => {
          maxChoicesSelect.value?.blur();
        },
      },
      {
        visible: resultsVisible.value,
        element: resultsSelect.value?.$el as HTMLElement | undefined,
        close: () => {
          resultsSelect.value?.blur();
        },
      },
    ];

    for (const picker of pickers) {
      if (!picker.visible || !picker.element) {
        continue;
      }

      const rect = picker.element.getBoundingClientRect();

      if (rect.bottom <= scrollRect.top || rect.top >= scrollRect.bottom) {
        picker.close();
      }
    }
  },
);

const disabledDate = (date: Date): boolean => {
  const now = Date.now();
  const firstDay = new Date(now + MIN_POLL_DURATION_MS);
  firstDay.setHours(0, 0, 0, 0);

  return date.getTime() < firstDay.getTime() || date.getTime() > now + MAX_POLL_DURATION_MS;
};

const getDeadlineTime = (hour: number, minute: number) => {
  const date = new Date(poll.value.deadline);
  date.setHours(hour, minute, 0, 0);

  return date.getTime();
};

const disabledHours = (): number[] => {
  const now = Date.now();
  const earliest = now + MIN_POLL_DURATION_MS;
  const latest = now + MAX_POLL_DURATION_MS;
  const hours = Array.from({ length: 24 }, (_value, hour) => {
    return hour;
  });

  return hours.filter((hour) => {
    const start = getDeadlineTime(hour, 0);
    const end = getDeadlineTime(hour, 59);

    return end < earliest || start > latest;
  });
};

const disabledMinutes = (hour: number): number[] => {
  const now = Date.now();
  const earliest = now + MIN_POLL_DURATION_MS;
  const latest = now + MAX_POLL_DURATION_MS;
  const minutes = Array.from({ length: 60 }, (_value, minute) => {
    return minute;
  });

  return minutes.filter((minute) => {
    const time = getDeadlineTime(hour, minute);

    return time < earliest || time > latest;
  });
};

const addOption = async () => {
  if (poll.value.options.length >= MAX_POLL_OPTIONS) {
    return;
  }

  poll.value.options.push('');

  await nextTick();
  pollRoot.value?.querySelector<HTMLInputElement>('.topic-poll-editor-option:last-child input')?.focus();
};

const focusQuestion = () => {
  questionInput.value?.focus();
};

defineExpose({ focusQuestion });

const removeOption = (index: number) => {
  const draft = poll.value;

  if (draft.options.length > MIN_POLL_OPTIONS) {
    emit('removeOption', index);
    draft.options.splice(index, 1);
    draft.maxChoices = Math.min(draft.maxChoices, draft.options.length);
  }
};
</script>

<template>
  <div ref="pollRoot" class="topic-poll-editor">
    <div class="topic-poll-editor-header">
      <div class="topic-poll-editor-heading">
        <span>{{ $t('enhancedTopic.poll.label') }}</span>
        <span class="topic-poll-editor-hint">{{ $t('enhancedTopic.pollEditor.topicHint') }}</span>
      </div>
      <ElButton type="danger" link @click="emit('remove')">
        {{ $t('enhancedTopic.pollEditor.remove') }}
      </ElButton>
    </div>
    <div class="topic-poll-editor-body">
      <ElFormItem class="topic-poll-editor-question" prop="poll.question">
        <ElInput
          ref="questionInput"
          v-model="poll.question"
          :placeholder="$t('enhancedTopic.pollEditor.question')"
          :aria-label="$t('enhancedTopic.pollEditor.question')"
          :maxlength="MAX_POLL_QUESTION_LENGTH"
          :validate-event="false"
          @blur="emit('validateField', 'question')"
        />
      </ElFormItem>
      <ElFormItem class="topic-poll-editor-options-field" prop="poll.options">
        <div class="topic-poll-editor-options">
          <div v-for="(_, index) in poll.options" :key="index" class="topic-poll-editor-option">
            <ElFormItem class="topic-poll-editor-option-field" :prop="`poll.options.${index}`">
              <ElInput
                v-model="poll.options[index]"
                class="topic-poll-editor-option-input"
                :aria-label="$t('enhancedTopic.pollEditor.option', { index: index + 1 })"
                :maxlength="MAX_POLL_OPTION_LENGTH"
                :placeholder="$t('enhancedTopic.pollEditor.option', { index: index + 1 })"
                :validate-event="false"
                @blur="emit('validateField', `options.${index}`)"
              />
            </ElFormItem>
            <ElButton
              class="topic-poll-editor-option-remove"
              type="danger"
              link
              :aria-label="$t('common.delete')"
              :disabled="poll.options.length <= MIN_POLL_OPTIONS"
              @click="removeOption(index)"
            >
              <un-i-mdi-trash-can-outline aria-hidden="true" />
            </ElButton>
          </div>
        </div>
      </ElFormItem>
      <div class="topic-poll-editor-add">
        <ElButton
          class="topic-poll-editor-add-button"
          :disabled="poll.options.length >= MAX_POLL_OPTIONS"
          @click="addOption"
        >
          {{ $t('enhancedTopic.pollEditor.addOption') }}
        </ElButton>
        <span class="topic-poll-editor-hint">{{ $t('enhancedTopic.pollEditor.optionsHint') }}</span>
      </div>
      <div class="topic-poll-editor-settings">
        <ElFormItem prop="poll.maxChoices" label-position="top" :label="$t('enhancedTopic.pollEditor.maxChoices')">
          <ElSelect
            ref="maxChoicesSelect"
            v-model="poll.maxChoices"
            placement="top-start"
            :popper-options="popperOptions"
            :validate-event="false"
            @change="emit('validateField', 'maxChoices')"
            @visible-change="maxChoicesVisible = $event"
          >
            <ElOption
              v-for="count in poll.options.length"
              :key="count"
              :label="
                count === 1
                  ? $t('enhancedTopic.pollEditor.singleChoice')
                  : $t('enhancedTopic.pollEditor.choiceCount', { count })
              "
              :value="count"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem
          ref="deadlineField"
          prop="poll.deadline"
          label-position="top"
          :label="$t('enhancedTopic.pollEditor.deadline')"
        >
          <ElDatePicker
            ref="deadlinePicker"
            v-model="poll.deadline"
            type="datetime"
            format="YYYY-MM-DD HH:mm"
            time-format="HH:mm"
            value-format="YYYY-MM-DD[T]HH:mm"
            placement="top-start"
            popper-class="topic-poll-editor-date-popper"
            :popper-options="popperOptions"
            :clearable="false"
            :show-now="false"
            :editable="false"
            :disabled-date="disabledDate"
            :disabled-hours="disabledHours"
            :disabled-minutes="disabledMinutes"
            :validate-event="false"
            @change="emit('validateField', 'deadline')"
            @visible-change="datePickerVisible = $event"
          />
        </ElFormItem>
        <ElFormItem prop="poll.results" label-position="top" :label="$t('enhancedTopic.pollEditor.results')">
          <ElSelect
            ref="resultsSelect"
            v-model="poll.results"
            placement="top-start"
            :popper-options="popperOptions"
            :validate-event="false"
            @change="emit('validateField', 'results')"
            @visible-change="resultsVisible = $event"
          >
            <ElOption value="always" :label="$t('enhancedTopic.pollEditor.always')" />
            <ElOption value="after_vote" :label="$t('enhancedTopic.pollEditor.afterVote')" />
            <ElOption value="after_close" :label="$t('enhancedTopic.pollEditor.afterClose')" />
          </ElSelect>
        </ElFormItem>
      </div>
      <div class="topic-poll-editor-switches">
        <ElCheckbox v-model="poll.public">{{ $t('enhancedTopic.pollEditor.public') }}</ElCheckbox>
        <ElCheckbox v-model="poll.revote">{{ $t('enhancedTopic.pollEditor.revote') }}</ElCheckbox>
        <p class="topic-poll-editor-hint">{{ $t('enhancedTopic.pollEditor.privacyHint') }}</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.topic-poll-editor-date-popper.el-popper {
  box-sizing: border-box;
  width: min(280px, calc(100vw - 32px));
  border-color: var(--el-border-color);

  .el-popper__arrow::before {
    border-color: var(--el-border-color);
  }

  .el-date-picker {
    width: 100%;
  }

  .el-picker-panel__content {
    width: auto;
    margin: 8px;
  }

  .el-date-picker__time-header {
    padding: 8px;
  }

  .el-date-picker__header {
    padding: 8px 8px 0;
    margin: 0;
  }

  .el-date-picker__header-label {
    font-size: 14px;
  }

  .el-date-picker__header--bordered {
    padding-bottom: 8px;
  }

  .el-date-table th {
    height: 24px;
    padding: 0;
    text-align: center;
  }

  .el-date-table td {
    height: 28px;
    padding: 0;
  }

  .el-date-table .el-date-table-cell {
    height: 28px;
    padding: 2px 0;
  }

  .el-month-table td,
  .el-year-table td {
    padding: 4px 0;
  }

  .el-time-panel {
    right: 0;
    left: auto;
    width: 136px;
  }

  .el-time-spinner__wrapper {
    max-height: 144px;
  }

  .el-time-spinner__list::before,
  .el-time-spinner__list::after {
    height: 56px;
  }
}
</style>

<style lang="scss" scoped>
.topic-poll-editor {
  --topic-poll-editor-field-gap: 18px;

  display: flex;
  flex: none;
  flex-direction: column;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);

  :deep(.el-form-item__label) {
    margin-bottom: 6px;
    font-weight: var(--el-font-weight-primary);
    line-height: 1.5;
  }
}

.topic-poll-editor-header {
  box-sizing: border-box;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 4px 14px;
  border-bottom: 1px solid var(--el-border-color);
}

.topic-poll-editor-body {
  display: flex;
  flex-direction: column;
  padding: 14px;
  container-type: inline-size;
}

.topic-poll-editor-hint {
  margin: 0;
  font-size: var(--el-font-size-small);
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.topic-poll-editor-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: baseline;
}

.topic-poll-editor-question,
.topic-poll-editor-options-field,
.topic-poll-editor-option-field {
  --el-form-item-margin-bottom: var(--topic-poll-editor-field-gap);
}

.topic-poll-editor-question :deep(.el-form-item__error),
.topic-poll-editor-options-field :deep(.el-form-item__error) {
  top: calc(100% + 2px);
  padding-top: 0;
  line-height: 14px;
}

.topic-poll-editor-option-field {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.topic-poll-editor-options {
  display: flex;
  flex-direction: column;
  gap: var(--topic-poll-editor-field-gap);
  width: 100%;
}

.topic-poll-editor-option {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.topic-poll-editor-option-input {
  width: 100%;
}

.topic-poll-editor-option-remove {
  flex: none;
  height: 40px;
  padding: 0;
  font-size: 18px;
}

.topic-poll-editor-add {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  align-items: center;

  .topic-poll-editor-hint {
    flex: 1;
    min-width: 120px;
    margin-top: 0;
  }
}

.topic-poll-editor-add-button {
  flex: none;
  color: var(--el-text-color-regular);
  background-color: transparent;
  border: 1px solid var(--el-border-color);

  &:hover,
  &:focus-visible {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
  }

  &.is-disabled,
  &.is-disabled:hover {
    color: var(--el-text-color-disabled);
    background-color: transparent;
    border-color: var(--el-border-color-lighter);
  }
}

.topic-poll-editor-settings {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;

  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__error) {
    top: calc(100% + 2px);
    padding-top: 0;
  }

  :deep(.el-date-editor) {
    width: 100%;
  }

  @container (max-width: 460px) {
    grid-template-columns: 1fr;
  }
}

.topic-poll-editor-switches {
  display: flex;
  flex-direction: column;
  gap: 10px;

  :deep(.el-checkbox) {
    align-items: flex-start;
    align-self: flex-start;
    height: auto;
    margin: 0;
  }

  :deep(.el-checkbox__label) {
    line-height: 1.5;
    white-space: normal;
  }

  :deep(.el-checkbox__input) {
    margin-top: calc((1.5em - var(--el-checkbox-input-height)) / 2);
  }
}
</style>
