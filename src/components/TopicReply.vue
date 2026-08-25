<script setup lang="ts">
import { computed, provide, ref } from 'vue';

import { NestedReplyDisplay } from '@/constants';
import { MENTION_REPLIES_INJECTION_KEY } from '@/constants/inject-key';

import FlatReplyList from './FlatReplyList.vue';
import MentionRepliesPopover from './MentionRepliesPopover.vue';
import NestedReplyList from './NestedReplyList.vue';

import type {
  MentionRepliesController,
  MentionRepliesTarget,
  UserReplyBatch,
  UserReplyItem,
  UserTopicReply,
} from '@/types';

interface Props extends UserTopicReply {
  batches: UserReplyBatch[];
  nestedReplyDisplay: NestedReplyDisplay;
  multipleInsideOne: boolean;
}

interface MentionRepliesResult {
  replies: UserReplyItem[];
  focusReplyNo?: string;
}

const props = defineProps<Props>();
const mentionRepliesPopover = ref<InstanceType<typeof MentionRepliesPopover> | null>(null);

const nestedReplyEnabled = computed<boolean>(() => {
  return props.nestedReplyDisplay !== NestedReplyDisplay.Off;
});

const getCurrentReplyIndex = (target: MentionRepliesTarget): number => {
  if (target.replyId) {
    return props.list.findIndex(({ replyId }) => replyId === target.replyId);
  }

  if (target.replyNo) {
    return props.list.findIndex(({ replyNo }) => replyNo === target.replyNo);
  }

  return -1;
};

const getMentionedUserReplies = (target: MentionRepliesTarget): MentionRepliesResult => {
  const currentReplyIndex = getCurrentReplyIndex(target);

  if (currentReplyIndex <= 0) {
    return {
      replies: [],
    };
  }

  const replies = props.list.slice(0, currentReplyIndex).filter(({ uid }) => uid === target.mentionUid);
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
  hide: (referenceElement: HTMLAnchorElement): void => {
    mentionRepliesPopover.value?.hide(referenceElement);
  },
  show: (target: MentionRepliesTarget): void => {
    const { replies, focusReplyNo } = getMentionedUserReplies(target);
    mentionRepliesPopover.value?.show(target.referenceElement, replies, focusReplyNo);
  },
};

provide(MENTION_REPLIES_INJECTION_KEY, mentionRepliesController);
</script>

<template>
  <NestedReplyList
    v-if="nestedReplyEnabled"
    :total="total"
    :batches="batches"
    :display="nestedReplyDisplay"
    :multiple-inside-one="multipleInsideOne"
  />
  <FlatReplyList v-else :total="total" :list="list" />
  <MentionRepliesPopover ref="mentionRepliesPopover" />
</template>
