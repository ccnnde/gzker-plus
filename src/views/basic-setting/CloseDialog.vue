<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { t } from '@/i18n';
import { DialogType } from '@/constants';

import type { CheckboxValueType } from 'element-plus';
import type { OptionsKey } from '@/constants';
import type { CheckItem, SettingProps } from '@/types';

const props = defineProps<SettingProps<OptionsKey.CloseDialogOnClickModal>>();

const allDialogTypes: DialogType[] = [DialogType.TopicViewer, DialogType.TopicEditor, DialogType.ReplyEditor];

const checkAll = ref(false);
const isIndeterminate = ref(false);

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
    {
      value: DialogType.ReplyEditor,
      label: t('basicSetting.closeDialogOnClickModal.replyEditor'),
    },
  ];
});

onMounted(() => {
  handleCheckedDialogsChange(props.settings.checkedDialogTypes);
});

const handleCheckAllChange = (val: CheckboxValueType) => {
  props.settings.checkedDialogTypes = val ? allDialogTypes : [];
  isIndeterminate.value = false;
};

const handleCheckedDialogsChange = (value: CheckboxValueType[]) => {
  const checkedCount = value.length;
  checkAll.value = checkedCount === allDialogTypes.length;
  isIndeterminate.value = checkedCount > 0 && checkedCount < allDialogTypes.length;
};
</script>

<template>
  <ElSpace>
    <ElCheckbox v-model="checkAll" :indeterminate="isIndeterminate" @change="handleCheckAllChange">
      {{ $t('common.checkAll') }}
    </ElCheckbox>
    <ElDivider direction="vertical" />
    <ElCheckboxGroup v-model="settings.checkedDialogTypes" @change="handleCheckedDialogsChange">
      <ElCheckbox v-for="(item, index) in checkDialogList" :key="index" :label="item.value">
        {{ item.label }}
      </ElCheckbox>
    </ElCheckboxGroup>
  </ElSpace>
</template>
