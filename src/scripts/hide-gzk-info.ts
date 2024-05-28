import { runtime } from 'webextension-polyfill';

import { getLoginUserId, getStorage } from '@/utils';
import { GzkInfoHideClass, GzkInfoType, OptionsKey } from '@/constants';

const applyHideGzkInfo = async () => {
  const { options } = await getStorage();
  const { checkedGzkInfoTypes } = options[OptionsKey.HideGzkInfo];

  checkedGzkInfoTypes.forEach((type) => {
    const hideClass = GzkInfoHideClass[type];

    if (hideClass) {
      document.body.classList.add(hideClass);
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
    } else if (type === GzkInfoType.TabIcon) {
      const iconLink = document.createElement('link');
      const iconUrl = runtime.getURL('icon/48.png');

      iconLink.rel = 'icon';
      iconLink.href = iconUrl;

      document.head.appendChild(iconLink);
    } else if (type === GzkInfoType.TabTitle) {
      document.title = 'Gzker Plus';
    }
  });
};

applyHideGzkInfo();
