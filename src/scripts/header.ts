import GzkHeader from '@/components/GzkHeader.vue';
import { createScriptApp } from '@/utils';
import { APP_ROOT_CLASS_PREFIX } from '@/constants';
import { SELECTOR_NAVBAR_RIGHT } from '@/constants/selector';

import type { Pinia } from 'pinia';
import type { CreateScriptApp } from '@/types';

export const createHeaderApp: CreateScriptApp = (pinia: Pinia) => {
  const id = APP_ROOT_CLASS_PREFIX + 'header';
  const navBarRight = document.querySelector(SELECTOR_NAVBAR_RIGHT);

  createScriptApp({
    root: GzkHeader,
    pinia,
    containerId: id,
    containerParentNode: navBarRight,
  });
};
