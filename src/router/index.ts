import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';

const routes: Readonly<RouteRecordRaw[]> = [];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
