import { computed, watch } from 'vue';
import { usePreferredDark } from '@vueuse/core';

import { useStorageStore } from '@/stores/storage';
import { isCurrentDarkMode, shouldBeDarkMode, updateDarkModeClass, updateDarkTheme, updateLightTheme } from '@/utils';
import { OptionsKey } from '@/constants';

export const useDarkMode = () => {
  const storage = useStorageStore();
  const preferredDark = usePreferredDark();

  const isDark = computed(() => {
    if (!storage.options) {
      return isCurrentDarkMode();
    }

    const { mode } = storage.options[OptionsKey.DarkMode];
    return shouldBeDarkMode(mode, preferredDark.value);
  });

  watch(isDark, (dark) => {
    updateDarkModeClass(dark);

    // 根据当前模式更新对应主题
    if (dark) {
      const { theme } = storage.options![OptionsKey.DarkTheme];
      updateDarkTheme(theme);
    } else {
      const { theme } = storage.options![OptionsKey.LightTheme];
      updateLightTheme(theme);
    }
  });

  // 监听深色主题变化
  watch(
    () => storage.options?.[OptionsKey.DarkTheme].theme,
    (theme) => {
      if (isDark.value && theme) {
        updateDarkTheme(theme);
      }
    },
  );

  // 监听浅色主题变化
  watch(
    () => storage.options?.[OptionsKey.LightTheme].theme,
    (theme) => {
      if (!isDark.value && theme) {
        updateLightTheme(theme);
      }
    },
  );

  return {
    isDark,
  };
};
