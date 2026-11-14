<script setup lang="ts">
import { NESTED_REPLY_DISPLAY_MODES } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.NestedReplyDisplay>>();
</script>

<template>
  <ElRadioGroup v-model="settings.display" class="radio-group-solid">
    <ElRadio v-for="mode in NESTED_REPLY_DISPLAY_MODES" :key="mode" :value="mode">
      {{ $t(`basicSetting.nestedReplyDisplay.${mode}`) }}
    </ElRadio>
  </ElRadioGroup>
</template>
