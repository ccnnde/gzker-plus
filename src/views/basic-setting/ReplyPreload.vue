<script setup lang="ts">
import { ReplyPreloadMode } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.ReplyPreload>>();
</script>

<template>
  <ElRadioGroup v-model="settings.mode" class="radio-group-solid">
    <ElRadio :value="ReplyPreloadMode.NoPreload">
      {{ $t('basicSetting.replyPreload.noPreload') }}
    </ElRadio>
    <ElRadio :value="ReplyPreloadMode.OnePage">
      {{ $t('basicSetting.replyPreload.onePage') }}
    </ElRadio>
    <ElRadio :value="ReplyPreloadMode.TwoPages">
      {{ $t('basicSetting.replyPreload.twoPages') }}
    </ElRadio>
    <ElRadio :value="ReplyPreloadMode.ThreePages">
      {{ $t('basicSetting.replyPreload.threePages') }}
    </ElRadio>
    <ElRadio :value="ReplyPreloadMode.FourPages">
      {{ $t('basicSetting.replyPreload.fourPages') }}
    </ElRadio>
  </ElRadioGroup>
</template>
