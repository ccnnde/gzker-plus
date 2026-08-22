<script setup lang="ts">
import NestedReplyBatch from './NestedReplyBatch.vue';

import type { NestedReplyDisplay } from '@/constants';
import type { UserReplyBatch } from '@/types';

interface Props {
  total: string;
  batches: UserReplyBatch[];
  display: NestedReplyDisplay;
  multipleInsideOne: boolean;
}

defineProps<Props>();
</script>

<template>
  <div class="nested-reply-list-total">
    {{ $t('enhancedTopic.replyTotal', { num: total }) }}
  </div>
  <NestedReplyBatch
    v-for="batch in batches"
    :key="`${batch.startPage}-${batch.endPage}`"
    :batch="batch"
    :display="display"
    :multiple-inside-one="multipleInsideOne"
  />
</template>

<style lang="scss" scoped>
.nested-reply-list-total {
  font-weight: var(--el-font-weight-primary);
  color: var(--el-text-color-primary);
}
</style>
