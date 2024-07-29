import { getStorage } from '@/utils';
import { OptionsKey } from '@/constants';
import { SELECTOR_MAIN_CONTAINER } from '@/constants/selector';

const applyBackTop = async () => {
  const { options } = await getStorage();
  const { checked } = options[OptionsKey.DblclickToTop];

  if (!checked) {
    return;
  }

  const mainContainerEle = document.querySelector(SELECTOR_MAIN_CONTAINER);

  document.addEventListener('dblclick', (e: Event) => {
    const target = e.target as HTMLElement;

    if (target === document.body || mainContainerEle?.contains(target)) {
      window.getSelection()?.removeAllRanges();
      document.body.scrollIntoView({ behavior: 'smooth' });
    }
  });
};

applyBackTop();
