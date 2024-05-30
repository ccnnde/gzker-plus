import { ElLoading } from 'element-plus';

import { getStorage } from '@/utils';
import { OptionsKey, topicLinkRegExp } from '@/constants';

const applyHideTopic = async () => {
  if (!topicLinkRegExp.test(location.pathname)) {
    return;
  }

  const { options } = await getStorage();

  if (!options[OptionsKey.EnhancedTopic].checked) {
    return;
  }

  document.documentElement.classList.add('hide-topic');

  const loading = ElLoading.service({
    target: document.documentElement,
    background: 'var(--el-overlay-color-lighter)',
  });

  setTimeout(() => {
    loading.close();
  }, 450);
};

applyHideTopic();
