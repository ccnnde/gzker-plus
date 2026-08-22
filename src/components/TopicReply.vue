<script setup lang="ts">
import { computed } from 'vue';

import { NestedReplyDisplay } from '@/constants';

import FlatReplyList from './FlatReplyList.vue';
import NestedReplyList from './NestedReplyList.vue';

import type { UserReplyBatch, UserTopicReply } from '@/types';

interface Props extends UserTopicReply {
  batches: UserReplyBatch[];
  nestedReplyDisplay: NestedReplyDisplay;
  multipleInsideOne: boolean;
}

const props = defineProps<Props>();

const nestedReplyEnabled = computed<boolean>(() => {
  return props.nestedReplyDisplay !== NestedReplyDisplay.Off;
});
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
</template>
