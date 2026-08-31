import FloatUserInfo from '@/components/FloatUserInfo.vue';
import { createScriptApp } from '@/utils';
import { APP_ROOT_CLASS_PREFIX } from '@/constants';

import type { Pinia } from 'pinia';
import type { CreateScriptApp } from '@/types';

export const createUserInfoApp: CreateScriptApp = (pinia: Pinia, context) => {
  const id = APP_ROOT_CLASS_PREFIX + 'user-info';

  createScriptApp({
    root: FloatUserInfo,
    pinia,
    context,
    containerId: id,
    containerParentNode: document.body,
  });
};
