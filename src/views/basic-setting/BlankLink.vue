<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { t } from '@/i18n';
import { LinkElementType } from '@/constants';

import type { CheckboxValueType } from 'element-plus';
import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

interface CheckLinkItem {
  value: LinkElementType;
  label: string;
}

const props = defineProps<SettingProps<OptionsKey.BlankLink>>();

const allLinkTypes: LinkElementType[] = [LinkElementType.Topic, LinkElementType.User, LinkElementType.Node];

const checkAll = ref(false);
const isIndeterminate = ref(false);

const checkLinkList = computed<CheckLinkItem[]>(() => {
  return [
    {
      value: LinkElementType.Topic,
      label: t('basicSetting.blankLink.topic'),
    },
    {
      value: LinkElementType.User,
      label: t('basicSetting.blankLink.user'),
    },
    {
      value: LinkElementType.Node,
      label: t('basicSetting.blankLink.node'),
    },
  ];
});

onMounted(() => {
  handleCheckedLinksChange(props.settings.checkedLinkTypes);
});

const handleCheckAllChange = (val: CheckboxValueType) => {
  props.settings.checkedLinkTypes = val ? allLinkTypes : [];
  isIndeterminate.value = false;
};

const handleCheckedLinksChange = (value: CheckboxValueType[]) => {
  const checkedCount = value.length;
  checkAll.value = checkedCount === allLinkTypes.length;
  isIndeterminate.value = checkedCount > 0 && checkedCount < allLinkTypes.length;
};
</script>

<template>
  <ElSpace>
    <ElCheckbox v-model="checkAll" :indeterminate="isIndeterminate" @change="handleCheckAllChange">
      {{ $t('common.checkAll') }}
    </ElCheckbox>
    <ElDivider direction="vertical" />
    <ElCheckboxGroup v-model="settings.checkedLinkTypes" @change="handleCheckedLinksChange">
      <ElCheckbox v-for="(item, index) in checkLinkList" :key="index" :label="item.value">{{ item.label }}</ElCheckbox>
    </ElCheckboxGroup>
  </ElSpace>
</template>
