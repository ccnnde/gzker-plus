import { getStorage } from '@/utils';
import { OptionsKey } from '@/constants';
import { SELECTOR_MAIN_CONTAINER } from '@/constants/selector';

import type { ContentScriptContext } from 'wxt/utils/content-script-context';

export const applyBackTop = async (ctx: ContentScriptContext) => {
  const { options } = await getStorage();
  const { checked } = options[OptionsKey.DblclickToTop];

  if (!checked) {
    return;
  }

  const mainContainerEle = document.querySelector(SELECTOR_MAIN_CONTAINER);

  ctx.addEventListener(document, 'dblclick', (e: Event) => {
    const target = e.target as HTMLElement;

    if (target === document.body || mainContainerEle?.contains(target)) {
      window.getSelection()?.removeAllRanges();
      document.body.scrollIntoView({ behavior: 'smooth' });
    }
  });
};
