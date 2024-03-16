import { createRouter, createWebHashHistory } from 'vue-router';

import { OptionsRouteNames, OptionsRoutePaths } from '@/constants';

import type { RouteRecordRaw } from 'vue-router';

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
    redirect: OptionsRoutePaths[OptionsRouteNames.BasicSetting],
  },
  {
    path: OptionsRoutePaths[OptionsRouteNames.BasicSetting],
    name: OptionsRouteNames.BasicSetting,
    component: () => import('@/views/basic-setting/BasicSetting.vue'),
    meta: {
      title: OptionsRouteNames.BasicSetting,
      icon: 'i-mdi-cog-outline',
    },
  },
  {
    path: OptionsRoutePaths[OptionsRouteNames.ImageHosting],
    name: OptionsRouteNames.ImageHosting,
    component: () => import('@/markdown/ImageHosting.md'),
    meta: {
      title: OptionsRouteNames.ImageHosting,
      icon: 'i-mdi-image-edit-outline',
    },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export { routes };

export default router;
