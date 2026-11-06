<script setup lang="ts">
import { computed, provide, ref } from 'vue';

import { getMentionedUserReplies } from '@/utils/reply-tree';
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
  sourceList: UserReplyItem[];
  forceFlat: boolean;
}

const props = defineProps<Props>();
const mentionRepliesPopover = ref<InstanceType<typeof MentionRepliesPopover> | null>(null);

const nestedReplyEnabled = computed(() => {
  return !props.forceFlat && props.nestedReplyDisplay !== NestedReplyDisplay.Off;
});

const mentionRepliesController: MentionRepliesController = {
  hide: (referenceElement: HTMLAnchorElement) => {
    mentionRepliesPopover.value?.hide(referenceElement);
  },
  show: (target: MentionRepliesTarget) => {
    const { replies, focusReplyNo } = getMentionedUserReplies(props.sourceList, target);
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
