import { getStorage } from '@/utils';
import { OptionsKey } from '@/constants';

const applyBackTop = async () => {
  const { options } = await getStorage();
  const { checked } = options[OptionsKey.DblclickToTop];

  if (!checked) {
    return;
  }

  document.addEventListener('dblclick', () => {
    window.getSelection()?.removeAllRanges();
    document.body.scrollIntoView({ behavior: 'smooth' });
  });
};

applyBackTop();
