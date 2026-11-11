import GzkHeader from '@/components/GzkHeader.vue';
import { createScriptApp } from '@/utils';
import { APP_ROOT_CLASS_PREFIX } from '@/constants';
import { SELECTOR_NAVBAR_RIGHT, SELECTOR_THEME_SWITCH } from '@/constants/selector';

import type { Pinia } from 'pinia';
import type { CreateScriptApp } from '@/types';

export const createHeaderApp: CreateScriptApp = (pinia: Pinia, context) => {
  const navBarRight = document.querySelector(SELECTOR_NAVBAR_RIGHT);

  if (!navBarRight) {
    return;
  }

  const toolbar = document.createElement('li');
  const themeSwitch = navBarRight.querySelector(SELECTOR_THEME_SWITCH);
  toolbar.className = 'gzkp-header-item';
  navBarRight.insertBefore(toolbar, themeSwitch);

  createScriptApp({
    root: GzkHeader,
    pinia,
    context,
    containerId: APP_ROOT_CLASS_PREFIX + 'header',
    containerParentNode: toolbar,
    onRemove: () => {
      toolbar.remove();
    },
  });
};
