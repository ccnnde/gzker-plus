import { defineContentScript } from 'wxt/utils/define-content-script';

import { loadEmojiFont } from '@/utils/emoji';

import { setupGzker } from '@/scripts';
import { applyBlankLink } from '@/scripts/blank-link';
import { applyBackTop } from '@/scripts/dblclick-to-top';
import { applyHideGzkInfo } from '@/scripts/hide-gzk-info';

export default defineContentScript({
  matches: ['*://www.guozaoke.com/*'],
  async main(ctx) {
    loadEmojiFont();
    await setupGzker(ctx);
    await applyBlankLink(ctx);
    await applyBackTop(ctx);
    await applyHideGzkInfo(ctx);
  },
});
