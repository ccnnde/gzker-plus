<script setup lang="ts">
import { provide } from 'vue';
import { ElScrollbar } from 'element-plus';
import { debounce } from 'lodash-es';

import { useDialog } from '@/composables/dialog';
import { useScrollbar } from '@/composables/scrollbar';
import { handleReplyLike } from '@/utils';
import { handleDialogBeforeClose, viewerOptions, vViewer } from '@/utils/img-viewer';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import ReplyItem from './ReplyItem.vue';

import type { UserReplyItem } from '@/types';

interface Props {
  modelValue: string;
  mentionUids: string[];
  conversations: UserReplyItem[];
}

defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  closeConversation: [];
}>();

const { dialogVisible, openDialog } = useDialog();
const { scrollbar, scrollToTop } = useScrollbar();

const handleMentionUidChange = (val: string) => {
  emit('update:modelValue', val);
  scrollToTop(false);
};

const updateScrollbar = debounce(() => {
  scrollbar.value?.update();
}, 500);

provide(UPDATE_SCROLLBAR_INJECTION_KEY, updateScrollbar);

defineExpose({
  openDialog,
});
</script>

<template>
  <ElDialog
    v-model="dialogVisible"
    class="conversation-dialog"
    :z-index="2001"
    :before-close="handleDialogBeforeClose"
    append-to-body
    @open="scrollToTop(false)"
    @closed="$emit('closeConversation')"
  >
    <template #header="{ titleId, titleClass }">
      <div class="conversation-header">
        <span :id="titleId" :class="titleClass">{{ $t('enhancedTopic.conversationList') }}</span>
        <ElSelect :model-value="modelValue" @change="handleMentionUidChange">
          <ElOption v-for="item in mentionUids" :key="item" :value="item" :label="'@' + item" />
        </ElSelect>
      </div>
    </template>
    <ElScrollbar ref="scrollbar">
      <div v-viewer="viewerOptions" class="conversation-container">
        <ReplyItem
          v-for="(item, index) in conversations"
          :key="index"
          v-bind="item"
          :is-not-in-conversation="false"
          @like-reply="handleReplyLike(item, $event)"
        />
      </div>
    </ElScrollbar>
  </ElDialog>
</template>

<style lang="scss">
.conversation-dialog {
  .el-dialog__header {
    padding-left: var(--gzk-topic-padding);
    margin-right: var(--gzk-topic-padding);
  }

  .el-dialog__body {
    padding: 0;
  }
}
</style>

<style lang="scss" scoped>
.conversation-container {
  max-height: 50vh;
  padding: var(--gzk-topic-padding);
}

.conversation-header {
  display: flex;
  align-items: center;

  & > span {
    margin-right: 10px;
  }
}
</style>
