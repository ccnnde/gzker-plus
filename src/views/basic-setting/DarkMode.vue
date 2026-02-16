<script setup lang="ts">
import { DarkMode } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.DarkMode>>();
</script>

<template>
  <ElRadioGroup v-model="settings.mode" class="radio-group-transparent">
    <ElRadioButton :label="DarkMode.On">
      <div class="radio-content-with-icon">
        <un-i-mdi-weather-night class="radio-icon" />
        <span>{{ $t('basicSetting.darkMode.on') }}</span>
      </div>
    </ElRadioButton>
    <ElRadioButton :label="DarkMode.Off">
      <div class="radio-content-with-icon">
        <un-i-mdi-white-balance-sunny class="radio-icon" />
        <span>{{ $t('basicSetting.darkMode.off') }}</span>
      </div>
    </ElRadioButton>
    <ElRadioButton :label="DarkMode.System">
      <div class="radio-content-with-icon">
        <un-i-mdi-theme-light-dark class="radio-icon" />
        <span>{{ $t('basicSetting.darkMode.system') }}</span>
      </div>
    </ElRadioButton>
  </ElRadioGroup>
</template>
