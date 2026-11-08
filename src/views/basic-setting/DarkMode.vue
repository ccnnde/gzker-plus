<script setup lang="ts">
import { DarkMode } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.DarkMode>>();
</script>

<template>
  <ElRadioGroup v-model="settings.mode" class="radio-group-transparent">
    <ElRadioButton :value="DarkMode.On">
      <div class="radio-content-with-icon">
        <i class="radio-icon i-gzkp-theme-moon" aria-hidden="true"></i>
        <span>{{ $t('basicSetting.darkMode.on') }}</span>
      </div>
    </ElRadioButton>
    <ElRadioButton :value="DarkMode.Off">
      <div class="radio-content-with-icon">
        <i class="radio-icon i-gzkp-theme-sun" aria-hidden="true"></i>
        <span>{{ $t('basicSetting.darkMode.off') }}</span>
      </div>
    </ElRadioButton>
    <ElRadioButton :value="DarkMode.System">
      <div class="radio-content-with-icon">
        <i class="radio-icon i-gzkp-theme-system" aria-hidden="true"></i>
        <span>{{ $t('basicSetting.darkMode.system') }}</span>
      </div>
    </ElRadioButton>
  </ElRadioGroup>
</template>
