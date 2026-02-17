import { computed, watch } from 'vue';
import { usePreferredDark } from '@vueuse/core';

import { useStorageStore } from '@/stores/storage';
import { DarkMode, OptionsKey } from '@/constants';

export const useDarkMode = () => {
  const store = useStorageStore();
  const preferredDark = usePreferredDark();

  const isDark = computed(() => {
    if (!store.options) {
      return false;
    }

    const mode = store.options[OptionsKey.DarkMode].mode;

    if (mode === DarkMode.On) {
      return true;
    }

    if (mode === DarkMode.Off) {
      return false;
    }

    return preferredDark.value;
  });

  watch(isDark, updateDarkClass, { immediate: true });

  function updateDarkClass() {
    if (isDark.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  return {
    isDark,
  };
};
