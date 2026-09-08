<script setup lang="ts">
import { LightTheme } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.LightTheme>>();
</script>

<template>
  <ElRadioGroup v-model="settings.theme" class="radio-group-solid">
    <ElRadio :value="LightTheme.Default">
      {{ $t('basicSetting.lightTheme.default') }}
    </ElRadio>
    <ElRadio :value="LightTheme.Solarized">
      {{ $t('basicSetting.lightTheme.solarized') }}
    </ElRadio>
    <ElRadio :value="LightTheme.TokyoNight">
      {{ $t('basicSetting.lightTheme.tokyoNight') }}
    </ElRadio>
  </ElRadioGroup>
</template>
