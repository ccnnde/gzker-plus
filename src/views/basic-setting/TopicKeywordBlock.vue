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
    class="options-bottom-sheet options-dialog topic-keyword-block-dialog"
    :title="$t('basicSetting.topicKeywordBlock.keywordBlockHelp')"
    :lock-scroll="false"
    modal-class="options-dialog-overlay"
    transition="options-dialog-transition"
    align-center
  >
    <ElScrollbar class="topic-keyword-block-dialog__scrollbar">
      <div class="topic-keyword-block-dialog__content">
        <KeywordBlockHelp />
      </div>
    </ElScrollbar>
  </ElDialog>
</template>

<style lang="scss">
@import '@/styles/mixin';

.topic-keyword-block-dialog {
  display: flex;
  flex-direction: column;
  width: 45%;
  max-width: 720px;
  max-height: calc(100dvh - 32px);
  padding: 0;
  overflow: hidden;

  @include dynamic-width(55%, 60%, 65%, 70%, 75%, 80%, 85%, 90%);

  .el-dialog__header {
    flex: 0 0 auto;
    padding-top: var(--el-dialog-padding-primary);
    padding-bottom: 0;
    padding-left: var(--el-dialog-padding-primary);
  }

  .el-dialog__body {
    flex: 1;
    min-height: 0;
    padding: 0;
    overflow: hidden;
  }

  .topic-keyword-block-dialog__scrollbar {
    height: 100%;
  }
}

@media (width <= 479px) {
  .options-dialog.topic-keyword-block-dialog {
    height: 65dvh;
    max-height: none;
  }
}
</style>

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

.topic-keyword-block-dialog__content {
  padding: var(--el-dialog-padding-primary);
}

@media (width <= 479px) {
  .topic-keyword-block-dialog__content {
    padding-bottom: calc(var(--el-dialog-padding-primary) + env(safe-area-inset-bottom));
  }
}
</style>
