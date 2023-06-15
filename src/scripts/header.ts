import { createApp } from 'vue';

import GzkHeader from '@/components/GzkHeader.vue';
import i18n from '@/i18n';
import { APP_ROOT_CLASS_PREFIX } from '@/constants';

import 'virtual:uno.css';

const app = createApp(GzkHeader);
const navBarRight = document.querySelector('.navbar-right');
const container = document.createElement('div');

container.id = APP_ROOT_CLASS_PREFIX + 'header';
navBarRight?.appendChild(container);

app.use(i18n);

app.mount(container);
