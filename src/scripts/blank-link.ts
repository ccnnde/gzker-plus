import { getStorage } from '@/utils';
import { LinkElementSelector, OptionsKey } from '@/constants';

const enableBlankLink = (selectors: string) => {
  document.querySelectorAll<HTMLAnchorElement>(selectors).forEach((element) => {
    element.target = '_blank';
  });
};

const applyBlankLink = async () => {
  const { options } = await getStorage();
  const { checkedLinkTypes } = options[OptionsKey.BlankLink];

  checkedLinkTypes.forEach((type) => {
    enableBlankLink(LinkElementSelector[type]);
  });
};

applyBlankLink();
