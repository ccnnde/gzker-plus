<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { debounce } from 'lodash-es';

import { useContentEditor } from '@/composables/content-editor';
import { useRequest } from '@/composables/request';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { createReply, modifyReply } from '@/api';
import { addUnit } from '@/utils';
import {
  EditHistoryType,
  getReplyCreateHistoryId,
  getReplyModifyHistoryId,
  saveEditHistory,
} from '@/utils/edit-history';
import { convertWeiboEmojiToImg, convertWeiboImgToEmoji } from '@/utils/emoji';

import ContentEditor from './ContentEditor.vue';
import EmojiPicker from './EmojiPicker.vue';
import MentionPicker from './MentionPicker.vue';

import type { CSSProperties } from 'vue';
import type { EditHistoryItem, UserReplyItem, UserTopic } from '@/types';

interface Props {
  topicId?: string;
  replyList: UserReplyItem[];
  height: number;
  fullscreen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  sended: [data: UserTopic];
  closed: [];
  toggleFullscreen: [];
}>();

let editedReplyId: string;

const editorVisible = ref(false);
const replyContent = ref('');
const {
  isAddContent,
  contentEditor,
  emojiPicker,
  mentionPicker,
  mentionPickerStyle,
  insertUid,
  insertEmoji,
  clearContent,
  refreshEditor,
  resetEditorLayout,
  showMentionPicker,
  isEmojiPickerVisible,
} = useContentEditor();

const editorTitle = computed(() => {
  return isAddContent.value ? t('enhancedTopic.createReply') : t('enhancedTopic.editReply');
});

const editorStyle = computed<CSSProperties>(() => {
  return {
    height: addUnit(props.height),
  };
});

const editorFullscreenClass = computed(() => {
  return props.fullscreen ? 'reply-editor-fullscreen' : 'reply-editor-minscreen';
});

const uidList = computed(() => {
  let replyUids = props.replyList.map((item) => item.uid as string);
  replyUids = [...new Set(replyUids)];
  return replyUids;
});

watch(
  () => props.fullscreen,
  () => {
    refreshEditor();
  },
);

const openEditor = () => {
  editorVisible.value = true;

  setTimeout(() => {
    contentEditor.value?.focusEndOfEditor();
  });
};

const closeEditor = () => {
  editorVisible.value = false;

  if (!isAddContent.value) {
    modifyHistoryId = '';
    clearContent();
  }

  contentEditor.value?.hideAllSubMenu();
  emit('closed');
};

const addReply = (content?: string) => {
  if (!isAddContent.value) {
    clearContent();
  }

  isAddContent.value = true;

  if (!content) {
    return;
  }

  setTimeout(() => {
    const newLine = replyContent.value ? '\n' : '';
    contentEditor.value?.appendValue(newLine + content);
  }, 50);
};

const editReply = (reply: UserReplyItem) => {
  isAddContent.value = false;
  editedReplyId = reply.replyId as string;
  modifyHistoryId = '';

  setTimeout(() => {
    const content = convertWeiboImgToEmoji(reply.content as string);
    contentEditor.value?.setValue(content);
  }, 0);

  setTimeout(() => {
    generateModifyHistoryId();
  }, 300);
};

const { isLoading, handleRequest } = useRequest();

const sendReply = () => {
  if (!replyContent.value) {
    ElMessage.error(t('enhancedTopic.replyContentCannotBeEmpty'));
    return;
  }

  handleRequest(async () => {
    const content = convertWeiboEmojiToImg(replyContent.value);
    let data;

    if (isAddContent.value) {
      data = await createReply(props.topicId as string, content);
      createHistoryId = '';
      clearContent();
      ElMessage.success(t('enhancedTopic.replyContentIsUnderReview'));

      setTimeout(() => {
        generateCreateHistoryId();
      }, 300);
    } else {
      data = await modifyReply(editedReplyId, content);
      ElMessage.success(t('enhancedTopic.editReplySuccessful'));
    }

    closeEditor();
    emit('sended', data);
  });
};

const storage = useStorageStore();
let createHistoryId = '';
let modifyHistoryId = '';

const editorHistoryType = computed<EditHistoryType>(() => {
  return isAddContent.value ? EditHistoryType.ReplyCreate : EditHistoryType.ReplyModify;
});

watch(replyContent, () => {
  updateEditHistory();
});

const generateCreateHistoryId = () => {
  const loginUserId = storage.settings?.loginUserId as string;
  createHistoryId = getReplyCreateHistoryId(loginUserId, props.topicId as string);
};

const generateModifyHistoryId = () => {
  const loginUserId = storage.settings?.loginUserId as string;
  modifyHistoryId = getReplyModifyHistoryId(loginUserId, props.topicId as string, editedReplyId);
};

const resetEditHistoryId = () => {
  createHistoryId = '';
  modifyHistoryId = '';
};

const updateEditHistory = debounce(() => {
  let editHistoryId = isAddContent.value ? createHistoryId : modifyHistoryId;

  if (editHistoryId) {
    saveEditHistory(editHistoryId, { content: replyContent.value });
  }
}, 200);

const importEditHistory = (data: EditHistoryItem) => {
  const { content } = data;

  if (isAddContent.value) {
    createHistoryId = '';
  } else {
    modifyHistoryId = '';
  }

  if (content !== undefined) {
    contentEditor.value?.setValue(content);
  }

  setTimeout(() => {
    if (isAddContent.value) {
      generateCreateHistoryId();
    } else {
      generateModifyHistoryId();
    }
  }, 300);
};

defineExpose({
  openEditor,
  closeEditor,
  resetEditorLayout,
  generateCreateHistoryId,
  resetEditHistoryId,
  addReply,
  editReply,
  clearContent,
  isEmojiPickerVisible,
});
</script>

<template>
  <div v-show="editorVisible" :class="['reply-editor-container', editorFullscreenClass]" :style="editorStyle">
    <div class="reply-editor-header">{{ editorTitle }}</div>
    <div class="reply-editor-body">
      <ContentEditor
        ref="contentEditor"
        v-model="replyContent"
        mentionable
        :editor-history-type="editorHistoryType"
        @import-history="importEditHistory"
        @submit-content="sendReply"
        @show-emoji-picker="emojiPicker?.showPicker"
        @show-mention-picker="showMentionPicker"
        @toggle-fullscreen="$emit('toggleFullscreen')"
      />
      <MentionPicker
        ref="mentionPicker"
        :style="mentionPickerStyle"
        :uid-list="uidList"
        @picked="insertUid"
        @hide="contentEditor?.focusEditor"
      />
    </div>
    <div class="reply-editor-footer">
      <EmojiPicker ref="emojiPicker" @select="insertEmoji" />
      <span>
        <ElButton @click="closeEditor">{{ $t('common.cancel') }}</ElButton>
        <ElButton type="primary" :loading="isLoading" @click="sendReply">{{ $t('common.post') }}</ElButton>
      </span>
    </div>
  </div>
</template>

<style lang="scss">
.reply-editor-container {
  display: flex;
  flex-direction: column;
  padding: var(--gzk-topic-padding);
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom-right-radius: var(--el-border-radius-base);
  border-bottom-left-radius: var(--el-border-radius-base);
}

.reply-editor-header {
  font-size: var(--el-font-size-large);
  line-height: var(--el-font-line-height-primary);
  color: var(--el-text-color-primary);
}

.reply-editor-body {
  flex: 1;
  margin: var(--gzk-topic-padding) 0;
  overflow: hidden;
}

.reply-editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
