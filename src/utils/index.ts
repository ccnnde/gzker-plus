import { t } from '@/i18n';

export const translateNavigation = (title: string | undefined) => {
  return title ? t('navigation.' + title) : '';
};
