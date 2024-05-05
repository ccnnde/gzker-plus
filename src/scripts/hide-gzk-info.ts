import { getStorage } from '@/utils';
import { GzkInfoHideClass, OptionsKey } from '@/constants';

const applyHideGzkInfo = async () => {
  const { options } = await getStorage();
  const { checkedGzkInfoTypes } = options[OptionsKey.HideGzkInfo];

  checkedGzkInfoTypes.forEach((type) => {
    document.body.classList.add(GzkInfoHideClass[type]);
  });
};

applyHideGzkInfo();
