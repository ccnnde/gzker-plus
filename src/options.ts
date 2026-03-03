import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { storage } from 'webextension-polyfill';

import Options from './pages/Options.vue';
import i18n from './i18n';
import router from './router';
import { createDebouncedStorageSync } from './utils';

import 'element-plus/theme-chalk/dark/css-vars.css';

import 'element-plus/es/components/table/style/css';
import 'element-plus/es/components/message/style/css';
import 'element-plus/es/components/message-box/style/css';
import 'element-plus/es/components/notification/style/css';
import './styles';

const app = createApp(Options);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);

app.mount('#app');

const debouncedSyncStorage = createDebouncedStorageSync();

/**
 * 监听 storage 变化，确保多个选项标签页之间的数据同步
 */
storage.sync.onChanged.addListener(() => {
  debouncedSyncStorage();
});
