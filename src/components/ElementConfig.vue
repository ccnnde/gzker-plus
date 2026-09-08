<script setup lang="ts">
import { computed } from 'vue';
import en from 'element-plus/es/locale/lang/en';
import zhCn from 'element-plus/es/locale/lang/zh-cn';

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
