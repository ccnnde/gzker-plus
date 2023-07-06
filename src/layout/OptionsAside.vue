<script setup lang="ts">
import { routes } from '@/router';
import { translateNavigation } from '@/utils';

import AsideItem from './AsideItem.vue';
</script>

<template>
  <ElAside class="aside-content">
    <ElMenu router :default-active="$route.path">
      <template v-for="{ path, meta, children } in routes" :key="path">
        <template v-if="meta">
          <ElSubMenu v-if="children" :index="path">
            <template #title>
              <AsideItem :title="translateNavigation(meta.title)" :icon="meta.icon" />
            </template>
            <ElMenuItem v-for="{ path: subPath, meta } in children" :key="subPath" :index="`${path}/${subPath}`">
              <AsideItem :title="translateNavigation(meta?.title)" />
            </ElMenuItem>
          </ElSubMenu>
          <ElMenuItem v-else :index="path">
            <AsideItem :title="translateNavigation(meta.title)" :icon="meta.icon" />
          </ElMenuItem>
        </template>
      </template>
    </ElMenu>
  </ElAside>
</template>

<style lang="scss" scoped>
.aside-content {
  width: 250px;
  margin: 20px;
  margin-right: 0;
  border: 1px solid var(--el-border-color);
  border-radius: 0.5em;

  .el-menu {
    border-right: none;
  }
}
</style>
