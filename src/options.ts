import { createApp } from 'vue';
import { createPinia } from 'pinia';

import Options from './pages/Options.vue';
import router from './router';
import i18n from './i18n';

const app = createApp(Options);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);

app.mount('#app');
