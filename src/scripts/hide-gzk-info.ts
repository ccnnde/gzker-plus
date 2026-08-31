import { browser } from 'wxt/browser';

import { getLoginUserId, getStorage } from '@/utils';
import { GzkInfoHideClass, GzkInfoType, OptionsKey } from '@/constants';

import type { ContentScriptContext } from 'wxt/utils/content-script-context';

export const applyHideGzkInfo = async (ctx: ContentScriptContext) => {
  const addedClasses = new Set<string>();
  const addedElements = new Set<HTMLElement>();
  const originalTitle = document.title;

  ctx.onInvalidated(() => {
    addedClasses.forEach((className) => {
      document.body?.classList.remove(className);
    });
    addedElements.forEach((element) => {
      element.remove();
    });
    document.title = originalTitle;
  });

  const { options } = await getStorage();

  if (ctx.isInvalid) {
    return;
  }

  const { checkedGzkInfoTypes } = options[OptionsKey.HideGzkInfo];

  checkedGzkInfoTypes.forEach((type) => {
    const hideClass = GzkInfoHideClass[type];

    if (hideClass) {
      document.body.classList.add(hideClass);
      addedClasses.add(hideClass);
    }

    if (type === GzkInfoType.Profile) {
      const loginUserId = getLoginUserId();

      if (!loginUserId) {
        return;
      }

      const style = document.createElement('style');
      const loginUserSelector = `a[href='/u/${loginUserId}']`;

      style.textContent = `
        .usercard ${loginUserSelector} img.avatar,
        .profile ${loginUserSelector} img.avatar,
        .usercard ${loginUserSelector} + .username,
        .profile ${loginUserSelector} + .username {
          filter: blur(6px);
        }
      `;

      document.head.appendChild(style);
      addedElements.add(style);
    } else if (type === GzkInfoType.TabIcon) {
      const iconLink = document.createElement('link');
      const iconUrl = browser.runtime.getURL('/icon/48.png');

      iconLink.rel = 'icon';
      iconLink.href = iconUrl;

      document.head.appendChild(iconLink);
      addedElements.add(iconLink);
    } else if (type === GzkInfoType.TabTitle) {
      document.title = 'Gzker Plus';
    }
  });
};
