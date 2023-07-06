<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue';

import { t } from '@/i18n';
import { getStorage, setStorage } from '@/utils';
import { OptionsKey } from '@/constants';
import { Options, Setting } from '@/types';

import BlankLink from './BlankLink.vue';

const options = ref<Options>();

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
      ],
    },
  ];
});

onMounted(async () => {
  const settings = await getStorage();
  options.value = settings.options;
});

watch(
  options,
  (newOptions, oldOptions) => {
    if (!oldOptions) {
      return;
    }

    setStorage({
      options: toRaw(newOptions),
    });
  },
  { deep: true },
);
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
            v-model="(options[item.key] as any).checked"
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
  border-radius: 4px;
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
  border-radius: 4px;
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
  height: 35px;
  line-height: 35px;
}

.setting-item-description,
.setting-item-description-check :deep(.el-checkbox__label) {
  font-size: 1em;
  font-weight: normal;
  color: #777;
}
</style>
