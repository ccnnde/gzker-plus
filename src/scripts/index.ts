import { createPinia } from 'pinia';
import { runtime, storage } from 'webextension-polyfill';

import { blockTopics, createDebouncedStorageSync, getLoginUserId, getStorage, setStorage } from '@/utils';
import { ExtensionMessageType, OptionsKey } from '@/constants';

import { getKeywordList, handleBlockKeyword } from './block-keyword';
import { createUserInfoApp } from './float-user-info';
import { createHeaderApp } from './header';
import { createTopicApp } from './topic';

import type { ExtensionMessage } from '@/types';

import 'virtual:uno.css';

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

const debouncedSyncStorage = createDebouncedStorageSync();

/**
 * 监听 storage 变化
 * - 当用户在选项页面改变设置时同步更新所有打开的论坛标签页的 storage store
 * - 确保部分设置及时更新（比如深色模式的切换）
 */
storage.sync.onChanged.addListener(() => {
  debouncedSyncStorage();
});
