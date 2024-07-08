<script setup lang="ts">
import { computed } from 'vue';

import CheckAll from '@/components/CheckAll.vue';
import { t } from '@/i18n';
import { DialogType } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { CheckItem, SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.CloseDialogOnClickModal>>();

const checkDialogList = computed<CheckItem<DialogType>[]>(() => {
  return [
    {
      value: DialogType.TopicViewer,
      label: t('basicSetting.closeDialogOnClickModal.topicViewer'),
    },
    {
      value: DialogType.TopicEditor,
      label: t('basicSetting.closeDialogOnClickModal.topicEditor'),
    },
  ];
});
</script>

<template>
  <CheckAll v-model="settings.checkedDialogTypes" :check-item-list="checkDialogList" />
</template>
