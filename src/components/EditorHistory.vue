<script setup lang="ts">
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
    class="editor-history-dialog"
    :title="$t('enhancedTopic.editorHistory')"
    :lock-scroll="false"
    :z-index="2001"
    append-to-body
    @open="scrollToTop(false)"
  >
    <ElScrollbar ref="scrollbar">
      <div class="editor-history-content"></div>
    </ElScrollbar>
  </ElDialog>
</template>

<style lang="scss">
.editor-history-dialog {
  .el-dialog__body {
    padding: 0;
  }
}
</style>

<style lang="scss" scoped>
.editor-history-content {
  max-height: 50vh;
  padding: var(--gzk-topic-padding) var(--el-dialog-padding-primary);
}
</style>
