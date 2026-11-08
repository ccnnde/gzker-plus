import { createI18n } from 'vue-i18n';

import { LanguageType } from '@/constants';

import en from './locales/en.json';
import zh from './locales/zh.json';

const i18n = createI18n({
  legacy: false,
  locale: LanguageType.ZH,
  fallbackLocale: LanguageType.ZH,
  messages: {
    [LanguageType.EN]: en,
    [LanguageType.ZH]: zh,
  },
});

const { t } = i18n.global;

export { t };

export default i18n;
