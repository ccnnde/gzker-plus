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
    path: OptionsRoutePaths[OptionsRouteNames.BlockedTopics],
    name: OptionsRouteNames.BlockedTopics,
    component: () => import('@/views/blocked-topics/BlockedTopics.vue'),
    meta: {
      title: OptionsRouteNames.BlockedTopics,
      icon: 'i-mdi-file-document-remove-outline',
    },
  },
  {
    path: OptionsRoutePaths[OptionsRouteNames.BiliImages],
    name: OptionsRouteNames.BiliImages,
    component: () => import('@/views/bili-images/BiliImages.vue'),
    meta: {
      title: OptionsRouteNames.BiliImages,
      icon: 'i-mdi-television-classic',
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
  {
    path: OptionsRoutePaths[OptionsRouteNames.ChangeLog],
    name: OptionsRouteNames.ChangeLog,
    component: () => import('@/markdown/ChangeLog.md'),
    meta: {
      title: OptionsRouteNames.ChangeLog,
      icon: 'i-mdi-update',
    },
  },
  {
    path: OptionsRoutePaths[OptionsRouteNames.About],
    name: OptionsRouteNames.About,
    component: () => import('@/markdown/About.md'),
    meta: {
      title: OptionsRouteNames.About,
      icon: 'i-mdi-information-outline',
    },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export { routes };

export default router;
