import { createPinia } from 'pinia';

import { blockTopics, getLoginUserId, getStorage, setStorage } from '@/utils';
import { OptionsKey } from '@/constants';

import { createUserInfoApp } from './float-user-info';
import { createHeaderApp } from './header';
import { createTopicApp } from './topic';

import 'github-markdown-css/github-markdown-light.css';
import 'virtual:uno.css';
import '@/styles/script-vars.scss';
import '@/styles/script-global.scss';

import 'element-plus/es/components/message/style/css';
import 'element-plus/es/components/message-box/style/css';

const pinia = createPinia();

const setupApp = async () => {
  const { options, blockedTopicList } = await getStorage();

  await setStorage({
    loginUserId: getLoginUserId(),
  });

  createHeaderApp(pinia);

  if (options[OptionsKey.FloatUserInfo].checked) {
    createUserInfoApp(pinia);
  }

  if (options[OptionsKey.EnhancedTopic].checked) {
    const blockedTopicIds = blockedTopicList.map((item) => item.id);
    blockTopics(blockedTopicIds);
    createTopicApp(pinia);
  }
};

setupApp();
