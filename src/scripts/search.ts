import GzkSearch from '@/components/GzkSearch.vue';
import { createScriptApp } from '@/utils';
import { APP_ROOT_CLASS_PREFIX } from '@/constants';
import { SELECTOR_MOBILE_SEARCH_LINK, SELECTOR_SEARCH_FORM } from '@/constants/selector';

import type { Pinia } from 'pinia';
import type { CreateScriptApp } from '@/types';

export const createSearchApp: CreateScriptApp = (pinia: Pinia, context) => {
  const id = APP_ROOT_CLASS_PREFIX + 'search';
  const searchForm = document.querySelector(SELECTOR_SEARCH_FORM);
  const mobileSearchLink = document.querySelector(SELECTOR_MOBILE_SEARCH_LINK);

  if (!searchForm && !mobileSearchLink) {
    return;
  }

  createScriptApp({
    root: GzkSearch,
    pinia,
    context,
    containerId: id,
    containerParentNode: document.body,
  });
};
