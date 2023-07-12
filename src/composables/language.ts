import { onBeforeMount } from 'vue';
import { useI18n } from 'vue-i18n';

import { useStorageStore } from '@/stores/storage';
import { getStorage } from '@/utils';

export const useLanguage = () => {
  const { locale } = useI18n();
  const { setSettings } = useStorageStore();

  onBeforeMount(async () => {
    const settings = await getStorage();
    locale.value = settings.lang;
    setSettings(settings);
  });

  return {
    locale,
  };
};
