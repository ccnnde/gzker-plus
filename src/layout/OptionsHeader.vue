<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { translateNavigation } from '@/utils';
import { LanguageType } from '@/constants';

const { locale } = useI18n();

const switchLanguage = (lang: LanguageType) => {
  locale.value = lang;
};
</script>

<template>
  <ElHeader class="header-content">
    <div class="header-title">
      <img class="mr-3 h-8 w-8" src="@/assets/img/logo.svg" />
      <span>{{ $t('options.title') }} </span>
      <ElDivider direction="vertical" />
      <span> {{ translateNavigation($route.meta.title) }}</span>
    </div>
    <div class="header-operate">
      <ElDropdown @command="switchLanguage">
        <un-i-mdi-translate class="operate-icon mr-3" />
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem :command="LanguageType.ZH">简体中文</ElDropdownItem>
            <ElDropdownItem :command="LanguageType.EN">English</ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
      <a href="https://github.com/ccnnde/gzker-plus" title="github" target="_blank">
        <un-i-mdi-github class="operate-icon" />
      </a>
    </div>
  </ElHeader>
</template>

<style lang="scss" scoped>
.header-content {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color);
}

.header-title {
  display: flex;
  flex-grow: 1;
  align-items: center;
  font-size: 1.2em;
  font-weight: 500;
  color: #333;
}

.header-operate {
  display: flex;
  align-items: center;
}

.operate-icon {
  font-size: 1.6em;
  color: rgb(60 60 60 / 70%);
  cursor: pointer;
  transition: color 0.1s ease-in;

  &:hover {
    color: #213547;
  }
}
</style>
