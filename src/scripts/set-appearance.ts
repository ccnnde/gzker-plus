import {
  getStorage,
  isSystemDarkMode,
  shouldBeDarkMode,
  updateDarkModeClass,
  updateDarkTheme,
  updateLightTheme,
} from '@/utils';
import { DARK_MODE_CLASS, FORUM_THEME_ATTR, OptionsKey, THEME_ATTR } from '@/constants';

import type { ContentScriptContext } from 'wxt/utils/content-script-context';

const overrideForumTheme = (context: ContentScriptContext) => {
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

    if (root.style.getPropertyValue('background-color')) {
      root.style.removeProperty('background-color');
    }

    if (root.style.getPropertyValue('color-scheme')) {
      root.style.removeProperty('color-scheme');
    }
  };

  const observer = new MutationObserver(disableForumTheme);
  observer.observe(root, { attributes: true, attributeFilter: [FORUM_THEME_ATTR, 'style'] });
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

export const applyAppearance = async (ctx: ContentScriptContext) => {
  overrideForumTheme(ctx);

  const hadDarkModeClass = document.documentElement.classList.contains(DARK_MODE_CLASS);
  const originalTheme = document.documentElement.getAttribute(THEME_ATTR);

  ctx.onInvalidated(() => {
    document.documentElement.classList.toggle(DARK_MODE_CLASS, hadDarkModeClass);

    if (originalTheme === null) {
      document.documentElement.removeAttribute(THEME_ATTR);
    } else {
      document.documentElement.setAttribute(THEME_ATTR, originalTheme);
    }
  });

  const { options } = await getStorage();

  if (ctx.isInvalid) {
    return;
  }

  const { mode } = options[OptionsKey.DarkMode];
  const isDark = shouldBeDarkMode(mode, isSystemDarkMode());

  updateDarkModeClass(isDark);

  // 应用对应主题
  if (isDark) {
    const { theme } = options[OptionsKey.DarkTheme];
    updateDarkTheme(theme);
  } else {
    const { theme } = options[OptionsKey.LightTheme];
    updateLightTheme(theme);
  }
};
