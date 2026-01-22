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
  <div class="topic-keyword-block-container">
    <ElInput
      :model-value="settings.keywords"
      type="textarea"
      :placeholder="$t('basicSetting.topicKeywordBlock.placeholder')"
      :rows="6"
      spellcheck="false"
      resize="none"
      @input="handleInput"
    />
    <ElButton class="topic-keyword-block-help" type="warning" size="small" circle>
      <un-i-mdi-help />
    </ElButton>
  </div>
</template>

<style lang="scss" scoped>
.topic-keyword-block-container {
  position: relative;
  max-width: 620px;

  :deep(.el-textarea__inner) {
    overflow: auto;
    word-wrap: normal;
    white-space: pre;
    scrollbar-color: rgb(144 147 153 / 30%) transparent;
  }
}

.topic-keyword-block-help {
  position: absolute;
  right: 12px;
  bottom: 12px;
}
</style>
