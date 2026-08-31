import { defineContentScript } from 'wxt/utils/define-content-script';

import { applyAppearance } from '@/scripts/set-appearance';

export default defineContentScript({
  matches: ['*://www.guozaoke.com/*'],
  runAt: 'document_start',
  async main(ctx) {
    await applyAppearance(ctx);
  },
});
