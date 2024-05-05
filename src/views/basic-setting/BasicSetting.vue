<script setup lang="ts">
import { computed } from 'vue';

import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { OptionsKey } from '@/constants';

import BlankLink from './BlankLink.vue';
import CloseDialog from './CloseDialog.vue';
import EnhancedMsg from './EnhancedMsg.vue';
import HideGzkInfo from './HideGzkInfo.vue';
import SmApiKey from './SmApiKey.vue';

import type { CheckedOption, Setting } from '@/types';

const { options } = useStorageStore();

const settings = computed<Setting[]>(() => {
  return [
    {
      category: t('basicSetting.category.browse'),
      list: [
        {
          name: t('basicSetting.blankLink.title'),
          description: t('basicSetting.blankLink.titleDesc'),
          key: OptionsKey.BlankLink,
          component: BlankLink,
        },
        {
          name: t('basicSetting.enhancedMsg.title'),
          description: t('basicSetting.enhancedMsg.titleDesc'),
          key: OptionsKey.EnhancedMsg,
          component: EnhancedMsg,
        },
        {
          name: t('basicSetting.enhancedTopic.title'),
          description: t('basicSetting.enhancedTopic.titleDesc'),
          key: OptionsKey.EnhancedTopic,
        },
        {
          name: t('basicSetting.closeDialogOnClickModal.title'),
          description: t('basicSetting.closeDialogOnClickModal.titleDesc'),
          key: OptionsKey.CloseDialogOnClickModal,
          component: CloseDialog,
        },
      ],
    },
    {
      category: t('basicSetting.category.other'),
      list: [
        {
          name: t('basicSetting.floatUserInfo.title'),
          description: t('basicSetting.floatUserInfo.titleDesc'),
          key: OptionsKey.FloatUserInfo,
        },
        {
          name: t('basicSetting.dblclickToTop.title'),
          description: t('basicSetting.dblclickToTop.titleDesc'),
          key: OptionsKey.DblclickToTop,
        },
        {
          name: t('basicSetting.hideGzkInfo.title'),
          description: t('basicSetting.hideGzkInfo.titleDesc'),
          key: OptionsKey.HideGzkInfo,
          component: HideGzkInfo,
        },
        {
          name: t('basicSetting.smApiKey.title'),
          description: t('basicSetting.smApiKey.titleDesc'),
          key: OptionsKey.SmApiKey,
          component: SmApiKey,
        },
      ],
    },
  ];
});
</script>

<template>
  <template v-if="options">
    <section v-for="({ category, list }, index) in settings" :key="index" class="setting-category-content">
      <h2 class="setting-category-title">{{ category }}</h2>
      <ul>
        <li v-for="(item, index) in list" :key="index" class="setting-item-list">
          <span class="setting-item-title">{{ item.name }}</span>
          <ElCheckbox
            v-if="!item.component"
            v-model="(options[item.key] as CheckedOption).checked"
            class="setting-item-description-check"
            :label="item.description"
          />
          <span v-else class="setting-item-description">{{ item.description }}</span>
          <Component :is="item.component" :settings="options[item.key]" />
        </li>
      </ul>
    </section>
  </template>
</template>

<style lang="scss" scoped>
.setting-category-content {
  padding: 0.8em;
  border-radius: var(--el-border-radius-base);
  transition: background-color 0.3s ease-in;

  &:hover {
    background-color: var(--el-color-primary-light-9);
  }

  & + & {
    margin-top: 2em;
  }
}

.setting-category-title {
  padding-left: 0.5em;
  margin-bottom: 1em;
  font-size: 1.5em;
  font-weight: bold;
  border-left: 5px solid var(--el-color-primary);
  border-radius: var(--el-border-radius-base);
}

.setting-item-list {
  display: flex;
  flex-direction: column;

  & + & {
    margin-top: 1em;
  }
}

.setting-item-title {
  font-size: 1.2em;
  font-weight: 500;
}

.setting-item-description,
.setting-item-description-check {
  padding: 10px 0;
}

.setting-item-description,
.setting-item-description-check :deep(.el-checkbox__label) {
  font-size: 1em;
  font-weight: normal;
  line-height: 20px;
  color: #777;
}

.setting-item-description-check {
  align-items: flex-start;
  height: auto;

  :deep(.el-checkbox__input) {
    margin-top: 3px;
  }

  :deep(.el-checkbox__label) {
    white-space: normal;
  }
}
</style>
