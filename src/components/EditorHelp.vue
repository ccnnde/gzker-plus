<script setup lang="ts">
import { useDialog } from '@/composables/dialog';

const { dialogVisible, openDialog } = useDialog();

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
  />
</template>
