import { onBeforeMount } from 'vue';
import { useI18n } from 'vue-i18n';

import { useStorageStore } from '@/stores/storage';
import { getStorage } from '@/utils';

export const useLanguage = () => {
  const { locale } = useI18n();
  const storage = useStorageStore();

  onBeforeMount(async () => {
    let settings = storage.settings;

    if (!settings) {
      settings = await getStorage();
      storage.setSettings(settings);
    }

    locale.value = settings.lang;
  });

  return {
    locale,
  };
};
