import { getStorage, showGlobalLoading } from '@/utils';
import { OptionsKey, topicLinkRegExp } from '@/constants';

import type { ContentScriptContext } from 'wxt/utils/content-script-context';

export const applyHideTopic = async (ctx: ContentScriptContext) => {
  if (!topicLinkRegExp.test(window.location.pathname)) {
    return;
  }

  const { options } = await getStorage();

  if (!options[OptionsKey.EnhancedTopic].checked) {
    return;
  }

  if (ctx.isInvalid) {
    return;
  }

  showGlobalLoading({
    target: document.documentElement,
    background: 'transparent',
    customClass: 'gzkp-loading-global gzkp-loading-ring',
  });

  document.documentElement.classList.add('gzkp-hide-topic');

  ctx.onInvalidated(() => {
    window.__GZK_ElLoading?.close();
    window.__GZK_ElLoading = undefined;
    document.documentElement.classList.remove('gzkp-hide-topic');
  });
};
