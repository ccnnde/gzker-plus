<script setup lang="ts">
import { onUnmounted, provide, ref } from 'vue';
import { ElScrollbar } from 'element-plus';
import { debounce } from 'lodash-es';

import { useDialog } from '@/composables/dialog';
import { useScrollbar } from '@/composables/scrollbar';
import { getReplyKey, handleReplyLike } from '@/utils';
import { handleDialogBeforeClose, viewerOptions, vViewer } from '@/utils/img-viewer';
import { MENTION_REPLIES_INJECTION_KEY, UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import MentionRepliesPopover from './MentionRepliesPopover.vue';
import ReplyItem from './ReplyItem.vue';
import TopicUserInfoPopover from './TopicUserInfoPopover.vue';

import type { MentionRepliesController, MentionRepliesTarget, UserReplyItem } from '@/types';

interface MentionRepliesResult {
  replies: UserReplyItem[];
  focusReplyNo?: string;
}

const { dialogVisible, openDialog, closeDialog } = useDialog();
const { scrollbar, scrollToTop } = useScrollbar();
const hotRepliesContainer = ref<HTMLDivElement | null>(null);
const mentionRepliesPopover = ref<InstanceType<typeof MentionRepliesPopover> | null>(null);
const replySnapshot = ref<UserReplyItem[]>([]);
const hotReplies = ref<UserReplyItem[]>([]);

const normalizeSortableNumber = (value?: string): number => {
  const parsedValue = Number(value ?? 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const getSortedHotReplies = (replies: UserReplyItem[]): UserReplyItem[] => {
  return replies
    .filter((item) => normalizeSortableNumber(item.likeNumber) > 0)
    .sort((a, b) => {
      const likeDiff = normalizeSortableNumber(b.likeNumber) - normalizeSortableNumber(a.likeNumber);

      if (likeDiff !== 0) {
        return likeDiff;
      }

      return normalizeSortableNumber(a.replyNo) - normalizeSortableNumber(b.replyNo);
    });
};

const getMentionedUserReplies = (target: MentionRepliesTarget): MentionRepliesResult => {
  const currentReplyNo = Number(target.replyNo);
  const replies = replySnapshot.value
    .filter((item) => Number(item.replyNo) < currentReplyNo && item.uid === target.mentionUid)
    .sort((a, b) => normalizeSortableNumber(a.replyNo) - normalizeSortableNumber(b.replyNo));
  const explicitReply = target.mentionFloor
    ? replies.find(({ replyNo }) => replyNo === target.mentionFloor)
    : undefined;
  const focusReply = explicitReply || replies[replies.length - 1];

  return {
    replies,
    focusReplyNo: focusReply?.replyNo,
  };
};

const mentionRepliesController: MentionRepliesController = {
  hide: (referenceElement: HTMLAnchorElement) => {
    mentionRepliesPopover.value?.hide(referenceElement);
  },
  show: (target: MentionRepliesTarget) => {
    const { replies, focusReplyNo } = getMentionedUserReplies(target);
    mentionRepliesPopover.value?.show(target.referenceElement, replies, focusReplyNo);
  },
};

provide(MENTION_REPLIES_INJECTION_KEY, mentionRepliesController);

const updateScrollbar = debounce(() => {
  scrollbar.value?.update();
}, 500);

provide(UPDATE_SCROLLBAR_INJECTION_KEY, updateScrollbar);

const handleOpenDialog = (replies: UserReplyItem[]) => {
  replySnapshot.value = [...replies];
  hotReplies.value = getSortedHotReplies(replies);
  openDialog();
};

const handleCloseDialog = () => {
  closeDialog();
};

const handleDialogClosed = () => {
  replySnapshot.value = [];
  hotReplies.value = [];
};

onUnmounted(() => {
  updateScrollbar.cancel();
});

defineExpose({
  openDialog: handleOpenDialog,
  closeDialog: handleCloseDialog,
});
</script>

<template>
  <ElDialog
    v-model="dialogVisible"
    class="hot-replies-dialog"
    :lock-scroll="false"
    :z-index="2001"
    :before-close="handleDialogBeforeClose"
    append-to-body
    @open="scrollToTop(false)"
    @closed="handleDialogClosed"
  >
    <template #header="{ titleId, titleClass }">
      <span :id="titleId" :class="['hot-replies-title', titleClass]">
        {{ $t('enhancedTopic.hotReplies') }}
      </span>
    </template>
    <ElScrollbar ref="scrollbar">
      <div ref="hotRepliesContainer" v-viewer="viewerOptions" class="hot-replies-container">
        <ReplyItem
          v-for="(item, index) in hotReplies"
          :key="getReplyKey(item, index)"
          v-bind="item"
          :is-not-in-conversation="false"
          @like-reply="handleReplyLike(item, $event)"
        />
        <ElEmpty v-if="hotReplies.length === 0" :description="$t('enhancedTopic.noHotReplies')" />
      </div>
    </ElScrollbar>
    <MentionRepliesPopover v-if="dialogVisible" ref="mentionRepliesPopover" :z-index="2002" />
    <TopicUserInfoPopover v-if="dialogVisible" :container="hotRepliesContainer" :z-index="2002" />
  </ElDialog>
</template>

<style lang="scss">
.hot-replies-dialog {
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
.hot-replies-container {
  max-height: 50vh;
  padding: 0 var(--gzk-topic-padding);
}

.hot-replies-title {
  margin-right: var(--gzk-topic-padding);
}
</style>
