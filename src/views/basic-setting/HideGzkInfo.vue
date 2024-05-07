<script setup lang="ts">
import { computed } from 'vue';

import CheckAll from '@/components/CheckAll.vue';
import { t } from '@/i18n';
import { GzkInfoType } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { CheckItem, SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.HideGzkInfo>>();

const checkGzkInfoList = computed<CheckItem<GzkInfoType>[]>(() => {
  return [
    {
      value: GzkInfoType.GzkLogo,
      label: t('basicSetting.hideGzkInfo.gzkLogo'),
    },
    {
      value: GzkInfoType.Profile,
      label: t('basicSetting.hideGzkInfo.profile'),
    },
    {
      value: GzkInfoType.TabIcon,
      label: t('basicSetting.hideGzkInfo.tabIcon'),
    },
    {
      value: GzkInfoType.TabTitle,
      label: t('basicSetting.hideGzkInfo.tabTitle'),
    },
  ];
});
</script>

<template>
  <CheckAll v-model="settings.checkedGzkInfoTypes" :check-item-list="checkGzkInfoList" />
</template>
