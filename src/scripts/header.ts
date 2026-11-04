import GzkHeader from '@/components/GzkHeader.vue';
import { createScriptApp } from '@/utils';
import { APP_ROOT_CLASS_PREFIX, FORUM_THEME_ATTR } from '@/constants';
import { SELECTOR_NAVBAR_RIGHT, SELECTOR_THEME_SWITCH } from '@/constants/selector';

import type { Pinia } from 'pinia';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { CreateScriptApp } from '@/types';

const overrideForumTheme = (context: ContentScriptContext) => {
  if (!document.querySelector(SELECTOR_THEME_SWITCH)) {
    return;
  }

  const root = document.documentElement;
  const originalTheme = root.getAttribute(FORUM_THEME_ATTR);
  const originalBackground = root.style.getPropertyValue('background-color');
  const originalColorScheme = root.style.getPropertyValue('color-scheme');
  const backgroundPriority = root.style.getPropertyPriority('background-color');
  const colorSchemePriority = root.style.getPropertyPriority('color-scheme');
  const controlledClass = 'gzkp-theme-controlled';
  const hadControlledClass = root.classList.contains(controlledClass);

  const disableForumTheme = () => {
    if (root.getAttribute(FORUM_THEME_ATTR) !== 'light') {
      root.setAttribute(FORUM_THEME_ATTR, 'light');
    }

    root.style.removeProperty('background-color');
    root.style.removeProperty('color-scheme');
  };

  const observer = new MutationObserver(disableForumTheme);
  observer.observe(root, { attributes: true, attributeFilter: [FORUM_THEME_ATTR] });
  root.classList.add(controlledClass);
  disableForumTheme();

  context.onInvalidated(() => {
    observer.disconnect();
    root.classList.toggle(controlledClass, hadControlledClass);

    if (originalTheme === null) {
      root.removeAttribute(FORUM_THEME_ATTR);
    } else {
      root.setAttribute(FORUM_THEME_ATTR, originalTheme);
    }

    root.style.setProperty('background-color', originalBackground, backgroundPriority);
    root.style.setProperty('color-scheme', originalColorScheme, colorSchemePriority);
  });
};

export const createHeaderApp: CreateScriptApp = (pinia: Pinia, context) => {
  overrideForumTheme(context);

  const id = APP_ROOT_CLASS_PREFIX + 'header';
  const navBarRight = document.querySelector(SELECTOR_NAVBAR_RIGHT);

  createScriptApp({
    root: GzkHeader,
    pinia,
    context,
    containerId: id,
    containerParentNode: navBarRight?.querySelector(SELECTOR_THEME_SWITCH) ?? navBarRight,
  });
};
