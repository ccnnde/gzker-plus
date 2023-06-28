import type { I18nOptions } from 'vue-i18n';
import { createI18n } from 'vue-i18n';
import messages from '@intlify/unplugin-vue-i18n/messages';

import { LanguageType } from '@/constants';

const i18n = createI18n({
  legacy: false,
  locale: LanguageType.ZH,
  fallbackLocale: LanguageType.ZH,
  messages: messages as I18nOptions['messages'],
});

const { t } = i18n.global;

export { t };

export default i18n;
