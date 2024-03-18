<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { useDialog } from '@/composables/dialog';
import { useScrollbar } from '@/composables/scrollbar';
import { t } from '@/i18n';
import { deleteAllEditHistoryByType, EditHistoryType, getAllEditHistoryByType } from '@/utils/edit-history';
import { convertEmojiToNative } from '@/utils/emoji';

import type { EditHistoryItem } from '@/types';

interface Props {
  editorHistoryType: EditHistoryType;
}

interface HistoryTypeOption {
  value: EditHistoryType;
  label: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  importHistory: [data: EditHistoryItem];
}>();

const { dialogVisible, openDialog, closeDialog } = useDialog();
const { scrollbar } = useScrollbar();

const editHistoryList = ref<EditHistoryItem[]>([]);
const selectedHistoryType = ref(EditHistoryType.TopicCreate);

const historyTypeList: HistoryTypeOption[] = [
  {
    value: EditHistoryType.TopicCreate,
    label: t('enhancedTopic.createTopic'),
  },
  {
    value: EditHistoryType.TopicModify,
    label: t('enhancedTopic.editTopic'),
  },
  {
    value: EditHistoryType.ReplyCreate,
    label: t('enhancedTopic.createReply'),
  },
  {
    value: EditHistoryType.ReplyModify,
    label: t('enhancedTopic.editReply'),
  },
];

const disableImport = computed(() => {
  return selectedHistoryType.value !== props.editorHistoryType;
});

const handleHistoryTypeChange = () => {
  editHistoryList.value = getAllEditHistoryByType(selectedHistoryType.value);
};

const importEditHistory = (data: EditHistoryItem) => {
  emit('importHistory', data);
  ElMessage.success(t('common.imported'));

  setTimeout(() => {
    closeDialog();
  }, 300);
};

const deleteEditHistory = (id: string, index: number) => {
  localStorage.removeItem(id);
  editHistoryList.value.splice(index, 1);
};

const deleteAllEditHistory = () => {
  deleteAllEditHistoryByType(selectedHistoryType.value);
  editHistoryList.value = [];
};

const handleDialogOpen = () => {
  selectedHistoryType.value = props.editorHistoryType;
  handleHistoryTypeChange();
  scrollbar.value?.update();
};

const handleDialogClosed = () => {
  editHistoryList.value = [];
};

defineExpose({
  openDialog,
});
</script>

<template>
  <ElDialog
    v-model="dialogVisible"
    class="editor-history-dialog"
    :lock-scroll="false"
    :show-close="false"
    :z-index="2001"
    append-to-body
    @open="handleDialogOpen"
    @opened="scrollbar?.handleScroll"
    @closed="handleDialogClosed"
  >
    <template #header="{ titleId, titleClass }">
      <div class="editor-history-header">
        <div class="history-header-left">
          <span :id="titleId" :class="titleClass">{{ $t('enhancedTopic.editorHistory') }}</span>
          <ElSelect v-model="selectedHistoryType" class="history-type-select" @change="handleHistoryTypeChange">
            <ElOption v-for="(item, index) in historyTypeList" :key="index" :value="item.value" :label="item.label" />
          </ElSelect>
        </div>
        <ElPopconfirm
          :title="$t('enhancedTopic.confirmDeleteAllEditHistory')"
          :width="215"
          @confirm="deleteAllEditHistory"
        >
          <template #reference>
            <ElButton type="danger">{{ $t('common.clear') }}</ElButton>
          </template>
        </ElPopconfirm>
      </div>
    </template>
    <ElScrollbar ref="scrollbar">
      <div class="editor-history-content">
        <ElTimeline>
          <TransitionGroup name="history-list" @after-enter="scrollbar?.update" @after-leave="scrollbar?.update">
            <ElTimelineItem
              v-for="(item, index) in editHistoryList"
              :key="item.id"
              :timestamp="item.updateTime"
              type="primary"
              placement="top"
              hollow
            >
              <ElCard shadow="hover">
                <template #header>
                  <div class="history-card-header">
                    <span>
                      {{ item.uid }}
                      <span class="history-created-on">{{ $t('enhancedTopic.createdOn') }}</span>
                      {{ item.createTime }}
                    </span>
                    <span>
                      <ElPopconfirm
                        :title="$t('enhancedTopic.confirmImportEditHistory')"
                        :width="215"
                        @confirm="importEditHistory(item)"
                      >
                        <template #reference>
                          <ElButton type="info" text :disabled="disableImport">
                            {{ $t('common.import') }}
                          </ElButton>
                        </template>
                      </ElPopconfirm>
                      <ElPopconfirm
                        :title="$t('enhancedTopic.confirmDeleteEditHistory')"
                        :width="215"
                        @confirm="deleteEditHistory(item.id, index)"
                      >
                        <template #reference>
                          <ElButton type="info" text>{{ $t('common.delete') }}</ElButton>
                        </template>
                      </ElPopconfirm>
                    </span>
                  </div>
                </template>
                <template v-if="item.title !== undefined">
                  <label class="history-card-label">{{ $t('enhancedTopic.topicTitle') }}</label>
                  <p class="history-card-content">{{ item.title || '-' }}</p>
                  <label class="history-card-label">{{ $t('enhancedTopic.topicContent') }}</label>
                </template>
                <p class="history-card-content" v-html="convertEmojiToNative(item.content) || '-'"></p>
              </ElCard>
            </ElTimelineItem>
          </TransitionGroup>
        </ElTimeline>
        <Transition name="el-fade-in">
          <ElEmpty v-show="!editHistoryList.length" class="editor-history-empty" />
        </Transition>
      </div>
    </ElScrollbar>
  </ElDialog>
</template>

<style lang="scss">
.editor-history-dialog {
  border-radius: var(--el-border-radius-base);

  .el-dialog__header {
    margin-right: 0;
  }

  .el-dialog__body {
    padding: 0;
  }
}

.history-list-move,
.history-list-enter-active,
.history-list-leave-active {
  transition: all 0.5s ease;
}

.history-list-enter-from,
.history-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.history-list-leave-active {
  position: absolute;
}
</style>

<style lang="scss" scoped>
.editor-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .history-header-left {
    display: flex;
    align-items: center;
  }

  .history-type-select {
    width: 130px;
    margin-left: 10px;
  }
}

.editor-history-content {
  height: 50vh;
  padding: var(--gzk-topic-padding) var(--el-dialog-padding-primary);

  ul {
    padding: 0;
  }
}

.editor-history-empty {
  height: 100%;
}

.history-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  button {
    height: auto;
    padding: 0;
  }
}

.history-created-on {
  color: var(--el-text-color-regular);
}

.history-card-label {
  font-weight: normal;
  color: var(--el-text-color-regular);
}

.history-card-content {
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
