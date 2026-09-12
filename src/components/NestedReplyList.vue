<script setup lang="ts">
import { computed } from 'vue';

import { useStorageStore } from '@/stores/storage';
import { defaultExtensionOptions, OptionsKey } from '@/constants';

import NestedReplyBatch from './NestedReplyBatch.vue';

import type { NestedReplyDisplay } from '@/constants';
import type { UserReplyBatch } from '@/types';

interface Props {
  total: string;
  batches: UserReplyBatch[];
  display: NestedReplyDisplay;
  multipleInsideOne: boolean;
  reverse?: boolean;
}

defineProps<Props>();

const storage = useStorageStore();

const defaultExpanded = computed(() => {
  return (
    storage.options?.[OptionsKey.NestedReplyExpansion]?.expanded ??
    defaultExtensionOptions[OptionsKey.NestedReplyExpansion].expanded
  );
});
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
    :default-expanded="defaultExpanded"
    :multiple-inside-one="multipleInsideOne"
    :reverse="reverse"
  />
</template>

<style lang="scss" scoped>
.nested-reply-list-total {
  font-weight: var(--el-font-weight-primary);
  color: var(--el-text-color-primary);
}
</style>
