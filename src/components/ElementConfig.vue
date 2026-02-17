<script setup lang="ts">
import { computed } from 'vue';
import en from 'element-plus/dist/locale/en.mjs';
import zhCn from 'element-plus/dist/locale/zh-cn.mjs';

import { useDarkMode } from '@/composables/dark-mode';
import { useLanguage } from '@/composables/language';
import { LanguageType } from '@/constants';

const { locale: language } = useLanguage();

useDarkMode();

const locale = computed(() => {
  return language.value === LanguageType.ZH ? zhCn : en;
});
</script>

<template>
  <ElConfigProvider :locale="locale">
    <slot></slot>
  </ElConfigProvider>
</template>
