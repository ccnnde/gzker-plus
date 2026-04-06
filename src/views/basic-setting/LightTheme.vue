<script setup lang="ts">
import { LightTheme } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.LightTheme>>();
</script>

<template>
  <ElRadioGroup v-model="settings.theme" class="radio-group-solid">
    <ElRadio :label="LightTheme.Default">
      {{ $t('basicSetting.lightTheme.default') }}
    </ElRadio>
    <ElRadio :label="LightTheme.Solarized">
      {{ $t('basicSetting.lightTheme.solarized') }}
    </ElRadio>
  </ElRadioGroup>
</template>
