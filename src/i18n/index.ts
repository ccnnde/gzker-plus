import { createI18n } from 'vue-i18n';
import messages from '@intlify/unplugin-vue-i18n/messages';

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'zh',
  messages,
});

export default i18n;
