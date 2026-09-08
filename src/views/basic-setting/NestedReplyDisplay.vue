<script setup lang="ts">
import { NestedReplyDisplay } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.NestedReplyDisplay>>();
</script>

<template>
  <ElRadioGroup v-model="settings.display" class="radio-group-solid">
    <ElRadio :value="NestedReplyDisplay.Off">
      {{ $t('basicSetting.nestedReplyDisplay.off') }}
    </ElRadio>
    <ElRadio :value="NestedReplyDisplay.Indent">
      {{ $t('basicSetting.nestedReplyDisplay.indent') }}
    </ElRadio>
    <ElRadio :value="NestedReplyDisplay.Align">
      {{ $t('basicSetting.nestedReplyDisplay.align') }}
    </ElRadio>
  </ElRadioGroup>
</template>
