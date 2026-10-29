<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import OptionsAside from '@/layout/OptionsAside.vue';
import OptionsHeader from '@/layout/OptionsHeader.vue';
import ElementConfig from '@/components/ElementConfig.vue';
import { useScrollbar } from '@/composables/scrollbar';

const currentYear = new Date().getFullYear();

const route = useRoute();
const { scrollbar, scrollToTop } = useScrollbar();
const navigationOpen = ref(false);

watch(
  () => route.name,
  () => {
    navigationOpen.value = false;
    scrollToTop(false);
  },
);
</script>

<template>
  <ElementConfig>
    <ElContainer class="options-page uno-h-screen">
      <OptionsHeader @open-navigation="navigationOpen = true" />
      <ElContainer class="options-body">
        <OptionsAside />
        <ElMain class="options-main">
          <ElScrollbar ref="scrollbar">
            <RouterView />
          </ElScrollbar>
        </ElMain>
      </ElContainer>
      <ElFooter class="options-footer">
        <span class="options-footer__copyright"> {{ $t('common.extName') }} © 2024 - {{ currentYear }} by </span>
        <ElLink class="options-footer__author" type="primary" href="https://github.com/ccnnde" target="_blank">
          ccnnde
        </ElLink>
      </ElFooter>
      <ElDrawer
        v-model="navigationOpen"
        class="options-navigation-drawer"
        direction="ltr"
        size="min(250px, 100vw)"
        :show-close="false"
        :with-header="false"
      >
        <div class="options-navigation-drawer__content">
          <header class="options-navigation-drawer__header">
            <div class="options-navigation-drawer__title">
              <img src="@/assets/img/logo.svg" alt="" />
              <span>{{ $t('options.title') }}</span>
            </div>
            <button
              class="options-navigation-drawer__close"
              type="button"
              :aria-label="$t('options.closeNavigation')"
              @click="navigationOpen = false"
            >
              <un-i-mdi-close />
            </button>
          </header>
          <OptionsAside drawer @select="navigationOpen = false" />
        </div>
      </ElDrawer>
    </ElContainer>
  </ElementConfig>
</template>

<style lang="scss">
.options-main .markdown-body {
  max-width: 980px;

  ol,
  ul {
    list-style: initial;
  }

  img {
    display: inline;
  }
}

.options-dialog {
  .el-dialog__body {
    padding-top: 0;
    padding-bottom: 15px;
  }
}

.options-navigation-drawer {
  .el-drawer__body {
    padding: 0;
    overflow: hidden;
  }
}

@media (width <= 639px) {
  .options-dialog {
    width: calc(100% - 24px) !important;
    max-height: calc(100% - 24px);
    margin: 12px auto !important;
  }
}
</style>

<style lang="scss" scoped>
.options-page,
.options-body {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.options-page {
  width: 100%;
  height: 100vh;
  height: 100dvh;
}

.options-body {
  flex: 1;
}

.options-main {
  min-width: 0;
  min-height: 0;
  padding-right: 0;
  overflow: hidden;

  & > :deep(.el-scrollbar) > .el-scrollbar__wrap > .el-scrollbar__view {
    margin-right: var(--el-main-padding);
  }
}

.options-footer {
  box-sizing: border-box;
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  height: auto;
  min-height: 44px;
  padding: 8px 20px;
  overflow: hidden;
  color: var(--el-text-color-regular);
  border: 0;

  :deep(span) {
    font-size: 0.8em;
  }
}

.options-footer__copyright {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.options-footer__author {
  flex: 0 0 auto;
}

.options-navigation-drawer__content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.options-navigation-drawer__header {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
  padding: 0 10px 0 18px;
}

.options-navigation-drawer__title {
  display: flex;
  flex: 1 1 auto;
  gap: 12px;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  font-size: 1.2em;
  font-weight: 500;
  color: var(--el-text-color-primary);

  img {
    flex: 0 0 auto;
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  span {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.options-navigation-drawer__close {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 22px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--el-border-radius-base);

  &:hover {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color-light);
  }
}

@media (width <= 767px) {
  .options-main {
    padding-left: var(--el-main-padding);
  }
}

@media (width <= 639px) {
  .options-main {
    padding: 12px 0 16px 12px;

    & > :deep(.el-scrollbar) > .el-scrollbar__wrap > .el-scrollbar__view {
      margin-right: 12px;
    }
  }

  .options-footer {
    min-height: 40px;
    padding: 6px 12px max(6px, env(safe-area-inset-bottom));
  }
}
</style>
