<script setup lang="ts">
import EditorShortcut from '@/markdown/EditorShortcut.md';
import MarkdownGrammar from '@/markdown/MarkdownGrammar.md';
import { useDialog } from '@/composables/dialog';
import { useScrollbar } from '@/composables/scrollbar';

const { dialogVisible, openDialog } = useDialog();
const { scrollbar, scrollToTop } = useScrollbar();

defineExpose({
  openDialog,
});
</script>

<template>
  <ElDialog
    v-model="dialogVisible"
    class="editor-help-dialog"
    :title="$t('enhancedTopic.editorHelp')"
    :lock-scroll="false"
    :z-index="2001"
    append-to-body
    align-center
    @open="scrollToTop(false)"
  >
    <ElScrollbar ref="scrollbar">
      <ElRow class="editor-help-content" justify="space-between">
        <ElCol :span="11">
          <EditorShortcut />
        </ElCol>
        <ElCol :span="11">
          <MarkdownGrammar />
        </ElCol>
      </ElRow>
    </ElScrollbar>
  </ElDialog>
</template>

<style lang="scss">
.editor-help-dialog {
  display: flex;
  flex-direction: column;
  height: 90%;

  .el-dialog__body {
    flex: 1;
    padding: 0;
    overflow: hidden;
  }
}
</style>

<style lang="scss" scoped>
.editor-help-content {
  padding: var(--gzk-topic-padding) var(--el-dialog-padding-primary);
}
</style>
