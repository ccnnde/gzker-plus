import { computed, watch } from 'vue';
import { usePreferredDark } from '@vueuse/core';

import { useStorageStore } from '@/stores/storage';
import { isCurrentDarkMode, shouldBeDarkMode, updateDarkModeClass } from '@/utils';
import { OptionsKey } from '@/constants';

export const useDarkMode = () => {
  const store = useStorageStore();
  const preferredDark = usePreferredDark();

  const isDark = computed(() => {
    if (!store.options) {
      return isCurrentDarkMode();
    }

    const { mode } = store.options[OptionsKey.DarkMode];
    return shouldBeDarkMode(mode, preferredDark.value);
  });

  watch(isDark, updateDarkModeClass);

  return {
    isDark,
  };
};
