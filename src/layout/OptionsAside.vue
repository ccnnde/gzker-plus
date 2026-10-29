<script setup lang="ts">
import { routes } from '@/router';
import { translateNavigation } from '@/utils';

import AsideItem from './AsideItem.vue';

interface Props {
  drawer?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  select: [];
}>();
</script>

<template>
  <ElAside :class="['options-aside', { 'options-aside--drawer': drawer }]">
    <ElMenu router :default-active="$route.path" @select="emit('select')">
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
.options-aside {
  flex: 0 0 auto;
  width: 250px;
  margin: 20px;
  margin-right: 0;
  overflow: auto;
  border: 1px solid var(--el-border-color);
  border-radius: 0.5em;

  .el-menu {
    border-right: none;
  }
}

.options-aside--drawer {
  flex: 1;
  width: 100%;
  margin: 0;
  border: 0;
  border-radius: 0;

  .el-menu {
    padding: 12px;
  }
}

@media (width <= 767px) {
  .options-aside:not(.options-aside--drawer) {
    display: none;
  }
}
</style>
