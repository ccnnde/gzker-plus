<script setup lang="ts">
import { DarkTheme } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.DarkTheme>>();
</script>

<template>
  <ElRadioGroup v-model="settings.theme" class="radio-group-solid">
    <ElRadio :label="DarkTheme.Default">
      {{ $t('basicSetting.darkTheme.default') }}
    </ElRadio>
    <ElRadio :label="DarkTheme.Soft">
      {{ $t('basicSetting.darkTheme.soft') }}
    </ElRadio>
  </ElRadioGroup>
</template>
