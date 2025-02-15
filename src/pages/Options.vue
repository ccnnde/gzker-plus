<script setup lang="ts">
import { watch } from 'vue';
import { useRoute } from 'vue-router';

import OptionsAside from '@/layout/OptionsAside.vue';
import OptionsHeader from '@/layout/OptionsHeader.vue';
import ElementConfig from '@/components/ElementConfig.vue';
import { useScrollbar } from '@/composables/scrollbar';

const currentYear = new Date().getFullYear();

const route = useRoute();
const { scrollbar, scrollToTop } = useScrollbar();

watch(
  () => route.name,
  () => {
    scrollToTop(false);
  },
);
</script>

<template>
  <ElementConfig>
    <ElContainer class="options-container" h-screen>
      <OptionsHeader />
      <ElContainer class="options-container">
        <OptionsAside />
        <ElMain class="options-main">
          <ElScrollbar ref="scrollbar">
            <RouterView />
          </ElScrollbar>
        </ElMain>
      </ElContainer>
      <ElFooter class="footer-content">
        <span class="mr-1"> {{ $t('common.extName') }} © {{ currentYear }} by </span>
        <ElLink type="primary" href="https://github.com/ccnnde" target="_blank">ccnnde</ElLink>
      </ElFooter>
    </ElContainer>
  </ElementConfig>
</template>

<style lang="scss">
.options-main .markdown-body {
  max-width: 980px;

  h1,
  h2 {
    border-bottom: none;
  }

  ol,
  ul {
    list-style: initial;
  }

  img {
    display: inline;
  }
}
</style>

<style lang="scss" scoped>
.options-container {
  overflow: hidden;
}

.options-main {
  padding-right: 0;

  & > :deep(.el-scrollbar) > .el-scrollbar__wrap > .el-scrollbar__view {
    margin-right: var(--el-main-padding);
  }
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #777;

  :deep(span) {
    font-size: 0.8em;
  }
}
</style>
