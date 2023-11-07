<script setup lang="ts">
import { provide, ref } from 'vue';
import { debounce } from 'lodash-es';

import { handleReplyLike } from '@/utils';
import { handleDialogBeforeClose, viewerOptions, vViewer } from '@/utils/img-viewer';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import ReplyItem from './ReplyItem.vue';

import type { ElScrollbar } from 'element-plus';
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

const conversationDialogVisible = ref(false);

const openDialog = () => {
  conversationDialogVisible.value = true;
};

const handleMentionUidChange = (val: string) => {
  emit('update:modelValue', val);
  scrollToTop();
};

const scrollbar = ref<InstanceType<typeof ElScrollbar> | null>(null);

const updateScrollbar = debounce(() => {
  scrollbar.value?.update();
}, 500);

const scrollToTop = () => {
  scrollbar.value?.setScrollTop(0);
};

provide(UPDATE_SCROLLBAR_INJECTION_KEY, updateScrollbar);

defineExpose({
  openDialog,
});
</script>

<template>
  <ElDialog
    v-model="conversationDialogVisible"
    class="conversation-dialog"
    :z-index="2001"
    :before-close="handleDialogBeforeClose"
    append-to-body
    @open="scrollToTop"
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
@import '@/styles/mixin';

.conversation-dialog {
  width: 40%;
  border-radius: var(--el-border-radius-base);

  .el-dialog__header {
    padding-bottom: 0;
    padding-left: var(--gzk-topic-padding);
    margin-right: var(--gzk-topic-padding);
  }

  .el-dialog__body {
    padding: 0;
  }

  @include dynamic-width(50%, 55%, 60%, 65%, 70%, 75%, 80%, 85%);
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
