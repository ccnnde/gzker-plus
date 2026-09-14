import i18n from '@/i18n';
import { getStorage } from '@/utils';
import { OptionalPermissionCapability } from '@/constants';

import '@/styles/permission-window.scss';

const init = async () => {
  const { lang } = await getStorage();
  i18n.global.locale.value = lang;
  document.documentElement.lang = lang;

  const capability = new URLSearchParams(window.location.search).get('capability');

  if (capability === OptionalPermissionCapability.DownloadImage) {
    const { initDownloadPermission } = await import('./download');
    await initDownloadPermission();
    return;
  }

  const { initUploadPermission } = await import('./upload');
  initUploadPermission();
};

init();
