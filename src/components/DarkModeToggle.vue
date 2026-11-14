<script setup lang="ts">
import { computed } from 'vue';

import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { DarkMode, OptionsKey } from '@/constants';

import themeMoonIcon from '@/assets/icons/theme-moon.svg?raw';
import themeSunIcon from '@/assets/icons/theme-sun.svg?raw';
import themeSystemIcon from '@/assets/icons/theme-system.svg?raw';

defineOptions({
  inheritAttrs: false,
});

const storage = useStorageStore();
const settings = computed(() => {
  return storage.options?.[OptionsKey.DarkMode];
});

const mode = computed(() => {
  return settings.value?.mode ?? DarkMode.System;
});

const modeLabels = {
  [DarkMode.On]: 'basicSetting.darkMode.title',
  [DarkMode.Off]: 'gzkHeader.lightMode',
  [DarkMode.System]: 'basicSetting.darkMode.system',
} as const;

const modeIcons = {
  [DarkMode.On]: themeMoonIcon,
  [DarkMode.Off]: themeSunIcon,
  [DarkMode.System]: themeSystemIcon,
};

const nextMode = {
  [DarkMode.On]: DarkMode.Off,
  [DarkMode.Off]: DarkMode.System,
  [DarkMode.System]: DarkMode.On,
};

const label = computed(() => {
  return t(modeLabels[mode.value]);
});

const cycleMode = () => {
  if (!settings.value) {
    return;
  }

  settings.value.mode = nextMode[mode.value];
};
</script>

<template>
  <ElTooltip
    :content="label"
    :enterable="false"
    :hide-after="0"
    :show-arrow="false"
    :trigger-keys="[]"
    popper-class="gzkp-tooltip-popper"
  >
    <button v-bind="$attrs" type="button" :aria-label="label" @click="cycleMode">
      <span class="dark-mode-toggle-icon" aria-hidden="true" v-html="modeIcons[mode]"></span>
    </button>
  </ElTooltip>
</template>

<style lang="scss" scoped>
.dark-mode-toggle-icon {
  display: block;

  :deep(svg) {
    display: block;
    width: 1em;
    height: 1em;
  }
}
</style>
