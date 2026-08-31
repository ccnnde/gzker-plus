import { defineContentScript } from 'wxt/utils/define-content-script';

import { applyHideTopic } from '@/scripts/hide-topic';

export default defineContentScript({
  matches: ['*://www.guozaoke.com/t/*'],
  runAt: 'document_start',
  async main(ctx) {
    await applyHideTopic(ctx);
  },
});
