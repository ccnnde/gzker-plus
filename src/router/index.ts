import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHashHistory } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    title: string;
    icon?: string;
  }
}

// @unocss-include
const routes: Readonly<RouteRecordRaw[]> = [
  {
    path: '/',
    redirect: '/basic-setting',
  },
  {
    path: '/basic-setting',
    name: 'basicSetting',
    component: () => import('@/views/basic-setting/BasicSetting.vue'),
    meta: {
      title: 'basicSetting',
      icon: 'i-mdi-cog-outline',
    },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export { routes };

export default router;
