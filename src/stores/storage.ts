import { computed, ref, toRaw, watch } from 'vue';
import { defineStore } from 'pinia';

import { setStorage } from '@/utils';

import type { StorageSettings } from '@/types';

export const useStorageStore = defineStore('storage', () => {
  const settings = ref<StorageSettings>();
  const options = computed(() => settings.value?.options);
  const blockedTopicList = computed(() => settings.value?.blockedTopicList || []);
  let skipNextWatchCallback = false; // 标记是否跳过下一次 watch 回调（来自 storage.sync.onChanged 的更新）

  watch(
    options,
    (newOptions, oldOptions) => {
      // 如果是从 storage.sync.onChanged 同步来的更新，跳过这次 setStorage 调用
      if (!oldOptions || skipNextWatchCallback) {
        skipNextWatchCallback = false;
        return;
      }

      setStorage({
        options: toRaw(newOptions),
      });
    },
    { deep: true },
  );

  /**
   * 从 storage.sync.onChanged 事件更新整个 settings
   * 这样可以避免循环触发：watch 监听到 options 变化后，因为 skipNextWatchCallback 会跳过 setStorage
   */
  function updateSettingsFromStorage(value: StorageSettings) {
    skipNextWatchCallback = true;
    settings.value = value;
  }

  function setSettings(value: StorageSettings) {
    settings.value = value;
  }

  return {
    settings,
    options,
    blockedTopicList,
    setSettings,
    updateSettingsFromStorage,
  };
});
