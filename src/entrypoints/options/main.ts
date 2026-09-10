import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { browser } from 'wxt/browser';

import Options from '@/pages/Options.vue';
import router from '@/router';
import i18n from '@/i18n';
import { createDebouncedStorageSync } from '@/utils';
import { OPTIONS_PAGE_TAB_STATE_KEY } from '@/constants';

import type { OptionsPageTabState } from '@/types';

import 'element-plus/theme-chalk/dark/css-vars.css';

import 'element-plus/es/components/table/style/css';
import 'element-plus/es/components/message/style/css';
import 'element-plus/es/components/message-box/style/css';
import 'element-plus/es/components/notification/style/css';
import '@/styles';

const app = createApp(Options);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);

app.mount('#app');

const debouncedSyncStorage = createDebouncedStorageSync();
const handleStorageChange = () => {
  debouncedSyncStorage();
};

const registerOptionsPageTab = async () => {
  const tab = await browser.tabs.getCurrent();

  if (tab?.id === undefined) {
    return;
  }

  await browser.storage.session.set({
    [OPTIONS_PAGE_TAB_STATE_KEY]: {
      tabId: tab.id,
    } satisfies OptionsPageTabState,
  });
};

/**
 * 监听 storage 变化，确保多个选项标签页之间的数据同步
 */
browser.storage.sync.onChanged.addListener(handleStorageChange);

registerOptionsPageTab();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    browser.storage.sync.onChanged.removeListener(handleStorageChange);
    debouncedSyncStorage.cancel();
    app.unmount();
  });
}
