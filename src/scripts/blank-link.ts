import { getStorage } from '@/utils';
import { LinkElementSelector, OptionsKey } from '@/constants';

import type { ContentScriptContext } from 'wxt/utils/content-script-context';

const enableBlankLink = (selectors: string, originalTargets: Map<HTMLAnchorElement, string | null>) => {
  document.querySelectorAll<HTMLAnchorElement>(selectors).forEach((element: HTMLAnchorElement) => {
    if (!originalTargets.has(element)) {
      originalTargets.set(element, element.getAttribute('target'));
    }

    element.target = '_blank';
  });
};

export const applyBlankLink = async (ctx: ContentScriptContext) => {
  const originalTargets = new Map<HTMLAnchorElement, string | null>();

  ctx.onInvalidated(() => {
    originalTargets.forEach((target, element) => {
      if (target === null) {
        element.removeAttribute('target');
      } else {
        element.setAttribute('target', target);
      }
    });
  });

  const { options } = await getStorage();

  if (ctx.isInvalid) {
    return;
  }

  const { checkedLinkTypes } = options[OptionsKey.BlankLink];

  checkedLinkTypes.forEach((type) => {
    enableBlankLink(LinkElementSelector[type], originalTargets);
  });
};
