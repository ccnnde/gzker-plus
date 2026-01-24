<script setup lang="ts">
import { ElMessage } from 'element-plus';

import KeywordBlockHelp from '@/markdown/KeywordBlockHelp.md';
import { useDialog } from '@/composables/dialog';
import { t } from '@/i18n';
import { BLOCK_KEYWORD_MAX } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

const props = defineProps<SettingProps<OptionsKey.TopicKeywordBlock>>();

const { dialogVisible, openDialog } = useDialog();

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
    <ElButton class="topic-keyword-block-help" type="warning" size="small" circle @click="openDialog">
      <un-i-mdi-help />
    </ElButton>
  </div>
  <ElDialog
    v-model="dialogVisible"
    class="options-dialog"
    :title="$t('basicSetting.topicKeywordBlock.keywordBlockHelp')"
    align-center
  >
    <KeywordBlockHelp />
  </ElDialog>
</template>

<style lang="scss" scoped>
@import '@/styles/mixin';

.topic-keyword-block-container {
  position: relative;
  max-width: 620px;

  :deep(.el-textarea__inner) {
    overflow: auto;
    word-wrap: normal;
    white-space: pre;

    @include el-scrollbar;
  }
}

.topic-keyword-block-help {
  position: absolute;
  right: 12px;
  bottom: 12px;
}
</style>
