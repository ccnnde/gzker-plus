import Topic from '@/components/Topic.vue';
import { createScriptApp } from '@/utils';
import { APP_ROOT_CLASS_PREFIX } from '@/constants';

import type { Pinia } from 'pinia';
import type { CreateScriptApp } from '@/types';

export const createTopicApp: CreateScriptApp = (pinia: Pinia) => {
  const id = APP_ROOT_CLASS_PREFIX + 'topic';

  createScriptApp({
    root: Topic,
    pinia,
    containerId: id,
    containerParentNode: document.body,
  });
};
