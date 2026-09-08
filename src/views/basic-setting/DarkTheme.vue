<script setup lang="ts">
import { DarkTheme } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.DarkTheme>>();
</script>

<template>
  <ElRadioGroup v-model="settings.theme" class="radio-group-solid">
    <ElRadio :value="DarkTheme.Default">
      {{ $t('basicSetting.darkTheme.default') }}
    </ElRadio>
    <ElRadio :value="DarkTheme.Soft">
      {{ $t('basicSetting.darkTheme.soft') }}
    </ElRadio>
  </ElRadioGroup>
</template>
