<script setup lang="ts">
import { computed } from 'vue';

import CheckAll from '@/components/CheckAll.vue';
import { t } from '@/i18n';
import { LinkElementType } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { CheckItem, SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.BlankLink>>();

const checkLinkList = computed<CheckItem<LinkElementType>[]>(() => {
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
</script>

<template>
  <CheckAll v-model="settings.checkedLinkTypes" :check-item-list="checkLinkList" />
</template>
