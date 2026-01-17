import { createPinia } from 'pinia';
import { runtime } from 'webextension-polyfill';

import { blockTopics, getLoginUserId, getStorage, setStorage } from '@/utils';
import { ExtensionMessageType, OptionsKey } from '@/constants';

import { getKeywordList, handleBlockKeyword } from './block-keyword';
import { createUserInfoApp } from './float-user-info';
import { createHeaderApp } from './header';
import { createTopicApp } from './topic';

import type { ExtensionMessage } from '@/types';

import 'github-markdown-css/github-markdown-light.css';
import 'virtual:uno.css';
import '@/styles/script-vars.scss';
import '@/styles/script-global.scss';

import 'element-plus/es/components/message/style/css';
import 'element-plus/es/components/message-box/style/css';

runtime.onMessage.addListener((message: ExtensionMessage) => {
  switch (message.msgType) {
    case ExtensionMessageType.BlockKeyword:
      handleBlockKeyword(message.keyword || '');
      break;
  }
});

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
    const blockedKeywords = getKeywordList(options.topicKeywordBlock.keywords);
    blockTopics(blockedTopicIds, blockedKeywords);
    createTopicApp(pinia);
  }
};

setupApp();
