import GzkSearch from '@/components/GzkSearch.vue';
import { createScriptApp } from '@/utils';
import { APP_ROOT_CLASS_PREFIX } from '@/constants';
import { SELECTOR_SEARCH_FORM } from '@/constants/selector';

import type { Pinia } from 'pinia';
import type { CreateScriptApp } from '@/types';

export const createSearchApp: CreateScriptApp = (pinia: Pinia, context) => {
  const id = APP_ROOT_CLASS_PREFIX + 'search';
  const searchForm = document.querySelector(SELECTOR_SEARCH_FORM);

  if (!searchForm) {
    return;
  }

  const existingForm = searchForm.querySelector('form.J_search') as HTMLFormElement | null;
  const originalDisplay = existingForm?.style.display;

  if (existingForm) {
    existingForm.style.display = 'none';
  }

  createScriptApp({
    root: GzkSearch,
    pinia,
    context,
    containerId: id,
    containerParentNode: searchForm,
    onRemove() {
      if (existingForm && originalDisplay !== undefined) {
        existingForm.style.display = originalDisplay;
      }
    },
  });
};
