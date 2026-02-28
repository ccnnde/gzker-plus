import { getStorage, isSystemDarkMode, shouldBeDarkMode, updateDarkModeClass } from '@/utils';
import { OptionsKey } from '@/constants';

import 'element-plus/theme-chalk/dark/css-vars.css';
import '@/styles/github-markdown.css';
import '@/styles/script-vars.scss';
import '@/styles/script-global.scss';
import '@/styles/script-dark.scss';

const applyAppearance = async () => {
  const { options } = await getStorage();
  const { mode } = options[OptionsKey.DarkMode];
  const isDark = shouldBeDarkMode(mode, isSystemDarkMode());

  updateDarkModeClass(isDark);
};

applyAppearance();
