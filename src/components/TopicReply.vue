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
  reverse?: boolean;
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

const getMentionedUserReplies = (target: MentionRepliesTarget): MentionRepliesResult => {
  const currentReplyNo = Number(target.replyNo);
  const replies = props.list
    .filter((item) => Number(item.replyNo) < currentReplyNo && item.uid === target.mentionUid)
    .sort((a, b) => Number(a.replyNo) - Number(b.replyNo));

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
</script>

<template>
  <NestedReplyList
    v-if="nestedReplyEnabled"
    :total="total"
    :batches="batches"
    :display="nestedReplyDisplay"
    :multiple-inside-one="multipleInsideOne"
    :reverse="reverse"
  />
  <FlatReplyList v-else :total="total" :list="list" />
  <MentionRepliesPopover ref="mentionRepliesPopover" />
</template>
