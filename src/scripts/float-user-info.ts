import FloatUserInfo from '@/components/FloatUserInfo.vue';
import { createScriptApp } from '@/utils';
import { APP_ROOT_CLASS_PREFIX } from '@/constants';

import type { Pinia } from 'pinia';
import type { CreateScriptApp } from '@/types';

export const createUserInfoApp: CreateScriptApp = (pinia: Pinia) => {
  const id = APP_ROOT_CLASS_PREFIX + 'user-info';

  createScriptApp({
    root: FloatUserInfo,
    pinia,
    containerId: id,
    containerParentNode: document.body,
  });
};
