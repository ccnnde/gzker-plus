import { createApp } from 'vue';
import { createPinia } from 'pinia';

import GzkHeader from '@/components/GzkHeader.vue';
import i18n from '@/i18n';
import { APP_ROOT_CLASS_PREFIX } from '@/constants';

import 'virtual:uno.css';

const app = createApp(GzkHeader);
const pinia = createPinia();
const navBarRight = document.querySelector('.navbar-right');
const container = document.createElement('div');

container.id = APP_ROOT_CLASS_PREFIX + 'header';
navBarRight?.appendChild(container);

app.use(pinia);
app.use(i18n);

app.mount(container);
