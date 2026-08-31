import { getBlockedUserList } from '@/api';
import { getStorage } from '@/utils';
import { OptionsKey } from '@/constants';

import type { ContentScriptContext } from 'wxt/utils/content-script-context';

export const applyBlockUser = async (ctx: ContentScriptContext) => {
  const { options } = await getStorage();

  if (!options[OptionsKey.EnhancedTopic].checked) {
    return;
  }

  try {
    const blockedUsers = await getBlockedUserList();

    if (!blockedUsers.length) {
      return;
    }

    const userSelector = blockedUsers.map((item) => `[href="/u/${item}"]`).join(', ');
    const style = document.createElement('style');

    style.textContent = `
      .topic-item:has(span.username > a:is(${userSelector})),
      .hot-topics .cell:has(a:is(${userSelector})) {
        display: none
      }
    `;

    if (ctx.isInvalid) {
      return;
    }

    document.documentElement.appendChild(style);
    ctx.onInvalidated(() => {
      style.remove();
    });
  } catch (err) {
    console.error(err);
  }
};
