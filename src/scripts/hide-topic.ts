import { getStorage, showGlobalLoading } from '@/utils';
import { OptionsKey, topicLinkRegExp } from '@/constants';

const applyHideTopic = async () => {
  if (!topicLinkRegExp.test(window.location.pathname)) {
    return;
  }

  const { options } = await getStorage();

  if (!options[OptionsKey.EnhancedTopic].checked) {
    return;
  }

  showGlobalLoading({
    target: document.documentElement,
    background: 'transparent',
  });

  document.documentElement.classList.add('hide-topic');
};

applyHideTopic();
