import { defineContentScript } from 'wxt/utils/define-content-script';

import { BILI_IMAGE_PAGE_ORIGIN, BILI_IMAGE_UPLOAD_PATH } from '@/constants';

import { setupBiliImgUpload } from '@/scripts/upload-bili-img';

export default defineContentScript({
  registration: 'runtime',
  runAt: 'document_start',
  main(ctx) {
    if (location.origin !== BILI_IMAGE_PAGE_ORIGIN || location.pathname !== BILI_IMAGE_UPLOAD_PATH) {
      return;
    }

    setupBiliImgUpload(ctx);
  },
});
