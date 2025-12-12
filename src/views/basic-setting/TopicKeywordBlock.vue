<script setup lang="ts">
import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.TopicKeywordBlock>>();
</script>

<template>
  <ElInput
    v-model="settings.keywords"
    class="topic-keyword-block-textarea"
    type="textarea"
    :placeholder="$t('basicSetting.topicKeywordBlock.placeholder')"
    :rows="6"
  />
</template>

<style lang="scss" scoped>
.topic-keyword-block-textarea {
  max-width: 980px;
}
</style>
