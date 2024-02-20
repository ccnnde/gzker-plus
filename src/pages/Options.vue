<script setup lang="ts">
import OptionsAside from '@/layout/OptionsAside.vue';
import OptionsHeader from '@/layout/OptionsHeader.vue';
import ElementConfig from '@/components/ElementConfig.vue';

const currentYear = new Date().getFullYear();
</script>

<template>
  <ElementConfig>
    <ElContainer class="options-container" h-screen>
      <OptionsHeader />
      <ElContainer class="options-container">
        <OptionsAside />
        <ElMain class="options-main">
          <ElScrollbar always>
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

<style lang="scss" scoped>
.options-container {
  overflow: hidden;
}

.options-main {
  padding-right: 0;
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
