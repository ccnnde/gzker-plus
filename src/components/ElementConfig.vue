<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import en from 'element-plus/dist/locale/en.mjs';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';

const { locale: language } = useI18n();
const locale = computed(() => (language.value === 'zh' ? zhCn : en));
</script>

<template>
  <ElConfigProvider :locale="locale">
    <slot></slot>
  </ElConfigProvider>
</template>
