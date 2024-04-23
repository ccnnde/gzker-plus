import { computed } from 'vue';

import { useStorageStore } from '@/stores/storage';
import { OptionsKey } from '@/constants';

import type { DialogType } from '@/constants';

export const useClickModal = (dialogType: DialogType) => {
  const storage = useStorageStore();

  const closeOnClickModal = computed(() => {
    if (!storage.options) {
      return false;
    }

    const { checkedDialogTypes } = storage.options[OptionsKey.CloseDialogOnClickModal];
    return checkedDialogTypes.includes(dialogType);
  });

  return {
    closeOnClickModal,
  };
};
