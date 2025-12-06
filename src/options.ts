import { createApp } from 'vue';
import { createPinia } from 'pinia';

import Options from './pages/Options.vue';
import i18n from './i18n';
import router from './router';

import 'github-markdown-css/github-markdown-light.css';

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
