import { computed, ref, toRaw, watch } from 'vue';
import { defineStore } from 'pinia';

import { setStorage } from '@/utils';

import type { StorageSettings } from '@/types';

export const useStorageStore = defineStore('storage', () => {
  const settings = ref<StorageSettings>();
  const options = computed(() => settings.value?.options);
  const blockedTopicList = computed(() => settings.value?.blockedTopicList || []);

  watch(
    options,
    (newOptions, oldOptions) => {
      if (!oldOptions) {
        return;
      }

      setStorage({
        options: toRaw(newOptions),
      });
    },
    { deep: true },
  );

  function setSettings(value: StorageSettings) {
    settings.value = value;
  }

  return {
    settings,
    options,
    blockedTopicList,
    setSettings,
  };
});
