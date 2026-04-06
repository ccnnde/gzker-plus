import {
  getStorage,
  isSystemDarkMode,
  shouldBeDarkMode,
  updateDarkModeClass,
  updateDarkTheme,
  updateLightTheme,
} from '@/utils';
import { OptionsKey } from '@/constants';

import 'element-plus/theme-chalk/dark/css-vars.css';
import '@/styles/github-markdown.scss';
import '@/styles/cherry-markdown.scss';
import '@/styles/highlight.scss';
import '@/styles/script-vars.scss';
import '@/styles/script-global.scss';
import '@/styles/script-dark.scss';
import '@/styles/themes.scss';

const applyAppearance = async () => {
  const { options } = await getStorage();
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

applyAppearance();
