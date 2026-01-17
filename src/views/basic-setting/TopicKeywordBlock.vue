<script setup lang="ts">
import { ref } from 'vue';
import { ElInput, ElMessage } from 'element-plus';

import { t } from '@/i18n';
import { BLOCK_KEYWORD_MAX } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

const props = defineProps<SettingProps<OptionsKey.TopicKeywordBlock>>();

const inputRef = ref<InstanceType<typeof ElInput> | null>(null);

const isKeywordLengthExceeded = (text: string): boolean => {
  return text.split('\n').some((line) => line.length > BLOCK_KEYWORD_MAX);
};

const handleInput = (value: string) => {
  if (isKeywordLengthExceeded(value)) {
    ElMessage.error({
      message: t('keywordBlock.tooLong', { max: BLOCK_KEYWORD_MAX }),
      grouping: true,
    });

    const textarea = inputRef.value?.textarea;
    const cursorPos = textarea?.selectionStart ?? 0;

    // 恢复光标位置
    setTimeout(() => {
      if (textarea && cursorPos) {
        textarea.selectionStart = cursorPos - 1;
        textarea.selectionEnd = cursorPos - 1;
      }
    }, 0);
  } else {
    props.settings.keywords = value;
  }
};
</script>

<template>
  <ElInput
    ref="inputRef"
    :model-value="settings.keywords"
    class="topic-keyword-block-textarea"
    type="textarea"
    :placeholder="$t('basicSetting.topicKeywordBlock.placeholder')"
    :rows="6"
    @input="handleInput"
  />
</template>

<style lang="scss" scoped>
.topic-keyword-block-textarea {
  max-width: 980px;
}
</style>
