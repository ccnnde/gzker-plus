import { createPinia } from 'pinia';
import { ElMessage } from 'element-plus';
import { browser } from 'wxt/browser';

import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import {
  blockTopics,
  createDebouncedStorageSync,
  getLoginUserId,
  getStorage,
  restoreBlockedTopics,
  setStorage,
} from '@/utils';
import { ExtensionMessageType, OptionsKey } from '@/constants';

import { getKeywordList, handleBlockKeyword } from './block-keyword';
import { createUserInfoApp } from './float-user-info';
import { createHeaderApp } from './header';
import { createSearchApp } from './search';
import { createTopicApp } from './topic';

import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { ExtensionMessage } from '@/types';

import 'virtual:uno.css';

import 'element-plus/es/components/message/style/css';
import 'element-plus/es/components/message-box/style/css';

export const setupGzker = async (ctx: ContentScriptContext) => {
  const pinia = createPinia();
  const handleMessage = (message: ExtensionMessage) => {
    switch (message.msgType) {
      case ExtensionMessageType.BlockKeyword:
        handleBlockKeyword(message.keyword || '');
        break;
      case ExtensionMessageType.Base64Decode:
        if (message.decodedError) {
          ElMessage.error(t('base64Decode.decodeFailed'));
        } else {
          navigator.clipboard.writeText(message.decodedText as string);
          ElMessage.success(t('base64Decode.copySuccess', { text: message.decodedText }));
        }

        break;
    }
  };

  browser.runtime.onMessage.addListener(handleMessage);
  ctx.onInvalidated(() => {
    browser.runtime.onMessage.removeListener(handleMessage);
    restoreBlockedTopics();
  });

  const settings = await getStorage();

  if (ctx.isInvalid) {
    return;
  }

  settings.loginUserId = getLoginUserId();

  await setStorage({
    loginUserId: settings.loginUserId,
  });

  const storageStore = useStorageStore(pinia);
  storageStore.setSettings(settings);

  const { options, blockedTopicList } = settings;

  createHeaderApp(pinia, ctx);

  if (options[OptionsKey.FloatUserInfo].checked) {
    createUserInfoApp(pinia, ctx);
  }

  if (options[OptionsKey.EnhancedSearch].checked) {
    createSearchApp(pinia, ctx);
  }

  if (options[OptionsKey.EnhancedTopic].checked) {
    const blockedTopicIds = blockedTopicList.map((item) => item.id);
    const blockedKeywords = getKeywordList(options.topicKeywordBlock.keywords);
    blockTopics(blockedTopicIds, blockedKeywords);
    createTopicApp(pinia, ctx);
  }

  const debouncedSyncStorage = createDebouncedStorageSync();
  const handleStorageChange = () => {
    debouncedSyncStorage();
  };

  /**
   * 监听 storage 变化
   * - 当用户在选项页面改变设置时同步更新所有打开的论坛标签页的 storage store
   * - 确保部分设置及时更新（比如深色模式的切换）
   */
  browser.storage.sync.onChanged.addListener(handleStorageChange);
  ctx.onInvalidated(() => {
    browser.storage.sync.onChanged.removeListener(handleStorageChange);
    debouncedSyncStorage.cancel();
  });
};
