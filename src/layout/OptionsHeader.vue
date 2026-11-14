<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { setStorage, translateNavigation } from '@/utils';
import { LanguageType } from '@/constants';

const emit = defineEmits<{
  openNavigation: [];
}>();

const { locale } = useI18n();

const switchLanguage = (lang: LanguageType) => {
  locale.value = lang;
  setStorage({ lang });
};
</script>

<template>
  <ElHeader class="options-header">
    <button
      class="options-icon-button options-header-menu"
      type="button"
      :aria-label="$t('options.openNavigation')"
      @click="emit('openNavigation')"
    >
      <un-i-mdi-menu />
    </button>
    <div class="options-header-title">
      <div class="options-header-brand">
        <img src="@/assets/img/logo.svg" alt="" />
        <span>{{ $t('options.title') }}</span>
        <ElDivider direction="vertical" />
      </div>
      <span class="options-header-current">{{ translateNavigation($route.meta.title) }}</span>
    </div>
    <div class="options-header-actions">
      <ElDropdown @command="switchLanguage">
        <button
          class="options-icon-button options-header-language"
          type="button"
          :aria-label="$t('options.switchLanguage')"
        >
          <un-i-mdi-translate />
        </button>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem :command="LanguageType.ZH">简体中文</ElDropdownItem>
            <ElDropdownItem :command="LanguageType.EN">English</ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
      <a class="options-icon-button" href="https://github.com/ccnnde/gzker-plus" title="GitHub" target="_blank">
        <un-i-mdi-github />
      </a>
    </div>
  </ElHeader>
</template>

<style lang="scss" scoped>
.options-header {
  display: flex;
  flex: 0 0 auto;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color);
}

.options-header-menu {
  display: none;
  flex: 0 0 auto;
}

.options-header-title {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  font-size: 1.2em;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.options-header-brand {
  display: flex;
  align-items: center;

  img {
    width: 32px;
    height: 32px;
    margin-right: 12px;
    object-fit: contain;
  }
}

.options-header-current {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.options-header-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  align-items: center;
}

.options-header-language {
  &:focus {
    outline: none;
  }
}

@media (width <= 767px) {
  .options-header-menu {
    display: grid;
  }

  .options-header-brand {
    display: none;
  }
}

@media (width <= 639px) {
  .options-header {
    gap: 4px;
    height: 56px;
    padding: 0 8px;
  }

  .options-header-title {
    font-size: 15px;
  }

  .options-header-actions {
    gap: 0;
  }
}
</style>
