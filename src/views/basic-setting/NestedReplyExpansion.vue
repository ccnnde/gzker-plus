<script setup lang="ts">
import type { OptionsKey } from '@/constants';
import type { Options } from '@/types';

interface Props {
  settings: Options[OptionsKey.NestedReplyExpansion];
}

defineProps<Props>();
</script>

<template>
  <ElRadioGroup v-model="settings.expanded" class="radio-group-solid">
    <!-- value 同时接受字符串和布尔值，简写会传入空字符串。 -->
    <!-- eslint-disable-next-line vue/prefer-true-attribute-shorthand -->
    <ElRadio :value="true">
      {{ $t('basicSetting.nestedReplyExpansion.expanded') }}
    </ElRadio>
    <ElRadio :value="false">
      {{ $t('basicSetting.nestedReplyExpansion.collapsed') }}
    </ElRadio>
  </ElRadioGroup>
</template>
