import { createApp } from 'vue';
import { cloneDeep, merge } from 'lodash-es';
import { storage } from 'webextension-polyfill';

import i18n, { t } from '@/i18n';
import { defaultExtensionStorage } from '@/constants';

import type { ScriptAppOptions, StorageSettings } from '@/types';

export const createScriptApp = (options: ScriptAppOptions) => {
  const { root, pinia, containerId, containerParentNode } = options;
  const app = createApp(root);
  const container = document.createElement('div');

  container.id = containerId;
  containerParentNode?.appendChild(container);

  app.use(pinia);
  app.use(i18n);

  app.mount(container);
};

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
