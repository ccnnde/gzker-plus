import { defineContentScript } from 'wxt/utils/define-content-script';

import { applyBlockUser } from '@/scripts/block-user';

export default defineContentScript({
  matches: ['*://www.guozaoke.com/', '*://www.guozaoke.com/?p=*'],
  runAt: 'document_start',
  async main(ctx) {
    await applyBlockUser(ctx);
  },
});
