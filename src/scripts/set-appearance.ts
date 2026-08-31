import {
  getStorage,
  isSystemDarkMode,
  shouldBeDarkMode,
  updateDarkModeClass,
  updateDarkTheme,
  updateLightTheme,
} from '@/utils';
import { DARK_MODE_CLASS, OptionsKey, THEME_ATTR } from '@/constants';

import type { ContentScriptContext } from 'wxt/utils/content-script-context';

import 'element-plus/theme-chalk/dark/css-vars.css';
import '@/styles/github-markdown.scss';
import '@/styles/cherry-markdown.scss';
import '@/styles/highlight.scss';
import '@/styles/script-vars.scss';
import '@/styles/script-global.scss';
import '@/styles/script-dark.scss';
import '@/styles/themes.scss';

export const applyAppearance = async (ctx: ContentScriptContext) => {
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
