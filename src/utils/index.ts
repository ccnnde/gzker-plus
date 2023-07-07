import { cloneDeep, merge } from 'lodash-es';
import { storage } from 'webextension-polyfill';

import { t } from '@/i18n';
import { defaultExtensionStorage } from '@/constants';

import type { StorageSettings } from '@/types';

export const translateNavigation = (title: string | undefined) => {
  return title ? t('navigation.' + title) : '';
};

export const initStorage = async () => {
  const currentSettings = await getStorage();
  const fullSettings = cloneDeep(defaultExtensionStorage);

  merge(fullSettings, currentSettings);
  await setStorage(fullSettings);
};

export const setStorage = async (settings: Partial<StorageSettings>) => {
  await storage.sync.set(settings);
};

export const getStorage = async (): Promise<StorageSettings> => {
  const settings = await storage.sync.get();
  return settings as StorageSettings;
};
