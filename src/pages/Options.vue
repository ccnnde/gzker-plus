<script setup lang="ts">
import OptionsAside from '@/layout/OptionsAside.vue';
import OptionsHeader from '@/layout/OptionsHeader.vue';
import ElementConfig from '@/components/ElementConfig.vue';
import { useLanguage } from '@/composables/language';

const currentYear = new Date().getFullYear();

useLanguage();
</script>

<template>
  <ElementConfig>
    <ElContainer h-screen>
      <OptionsHeader />
      <ElContainer>
        <OptionsAside />
        <ElMain><RouterView /></ElMain>
      </ElContainer>
      <ElFooter class="footer-content">
        <span class="mr-1"> {{ $t('common.extName') }} © {{ currentYear }} by </span>
        <ElLink type="primary" href="https://github.com/ccnnde" target="_blank">ccnnde</ElLink>
      </ElFooter>
    </ElContainer>
  </ElementConfig>
</template>

<style lang="scss" scoped>
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
