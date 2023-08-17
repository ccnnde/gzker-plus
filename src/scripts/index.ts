import { createPinia } from 'pinia';

import { getStorage } from '@/utils';
import { OptionsKey } from '@/constants';

import { createUserInfoApp } from './float-user-info';
import { createHeaderApp } from './header';

import 'virtual:uno.css';
import '@/styles/script-vars.scss';

import 'element-plus/es/components/message/style/css';

const pinia = createPinia();

const setupApp = async () => {
  const { options } = await getStorage();

  createHeaderApp(pinia);

  if (options[OptionsKey.FloatUserInfo].checked) {
    createUserInfoApp(pinia);
  }
};

setupApp();
