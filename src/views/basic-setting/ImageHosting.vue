<script setup lang="ts">
import { computed } from 'vue';

import { t } from '@/i18n';
import { ImageHostingPlatform } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { CheckItem, SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.ImageHosting>>();

const imagePlatformList = computed<CheckItem<ImageHostingPlatform>[]>(() => {
  return [
    {
      value: ImageHostingPlatform.Smms,
      label: t('basicSetting.imageHosting.platform.smms'),
    },
    {
      value: ImageHostingPlatform.Bili,
      label: t('basicSetting.imageHosting.platform.bili'),
    },
  ];
});
</script>

<template>
  <ElSelect v-model="settings.platform" class="image-platform-select">
    <ElOption v-for="item in imagePlatformList" :key="item.value" :value="item.value" :label="item.label" />
  </ElSelect>
</template>

<style lang="scss" scoped>
.image-platform-select {
  width: 130px;
}
</style>
