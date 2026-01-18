<script setup lang="ts">
import { ElMessage } from 'element-plus';

import { t } from '@/i18n';
import { BLOCK_KEYWORD_MAX } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

const props = defineProps<SettingProps<OptionsKey.TopicKeywordBlock>>();

const handleInput = (value: string) => {
  const isKeywordInvalid = value.split('\n').some((k) => k.length > BLOCK_KEYWORD_MAX);

  if (isKeywordInvalid) {
    ElMessage.error({
      message: t('keywordBlock.tooLong', { max: BLOCK_KEYWORD_MAX }),
      grouping: true,
    });
  } else {
    props.settings.keywords = value;
  }
};
</script>

<template>
  <ElInput
    :model-value="settings.keywords"
    class="topic-keyword-block-textarea"
    type="textarea"
    :placeholder="$t('basicSetting.topicKeywordBlock.placeholder')"
    :rows="6"
    spellcheck="false"
    @input="handleInput"
  />
</template>

<style lang="scss" scoped>
.topic-keyword-block-textarea {
  max-width: 620px;

  :deep(.el-textarea__inner) {
    overflow: auto;
    word-wrap: normal;
    white-space: pre;
  }
}
</style>
