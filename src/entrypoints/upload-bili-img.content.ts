import { defineContentScript } from 'wxt/utils/define-content-script';

import { setupBiliImgUpload } from '@/scripts/upload-bili-img';

export default defineContentScript({
  matches: ['https://www.bilibili.com/gzk-img-upload'],
  runAt: 'document_start',
  main(ctx) {
    setupBiliImgUpload(ctx);
  },
});
