import { createPinia } from 'pinia';

import { createHeaderApp } from './header';

import 'virtual:uno.css';

const pinia = createPinia();

const setupApp = async () => {
  createHeaderApp(pinia);
};

setupApp();
