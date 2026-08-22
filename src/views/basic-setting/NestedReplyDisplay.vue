<script setup lang="ts">
import { NestedReplyDisplay } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.NestedReplyDisplay>>();
</script>

<template>
  <ElRadioGroup v-model="settings.display" class="radio-group-solid">
    <ElRadio :label="NestedReplyDisplay.Off">
      {{ $t('basicSetting.nestedReplyDisplay.off') }}
    </ElRadio>
    <ElRadio :label="NestedReplyDisplay.Indent">
      {{ $t('basicSetting.nestedReplyDisplay.indent') }}
    </ElRadio>
    <ElRadio :label="NestedReplyDisplay.Align">
      {{ $t('basicSetting.nestedReplyDisplay.align') }}
    </ElRadio>
  </ElRadioGroup>
</template>
