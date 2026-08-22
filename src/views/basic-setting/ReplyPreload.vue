<script setup lang="ts">
import { ReplyPreloadMode } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.ReplyPreload>>();
</script>

<template>
  <ElRadioGroup v-model="settings.mode" class="radio-group-solid">
    <ElRadio :label="ReplyPreloadMode.NoPreload">
      {{ $t('basicSetting.replyPreload.noPreload') }}
    </ElRadio>
    <ElRadio :label="ReplyPreloadMode.OnePage">
      {{ $t('basicSetting.replyPreload.onePage') }}
    </ElRadio>
    <ElRadio :label="ReplyPreloadMode.TwoPages">
      {{ $t('basicSetting.replyPreload.twoPages') }}
    </ElRadio>
  </ElRadioGroup>
</template>
