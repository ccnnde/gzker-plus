<script setup lang="ts" generic="T extends string">
import { computed, onMounted, ref } from 'vue';

import type { CheckboxValueType } from 'element-plus';
import type { CheckItem } from '@/types';

interface Props {
  modelValue: T[];
  checkItemList: CheckItem<T>[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: CheckboxValueType[]];
}>();

const checkAll = ref(false);
const isIndeterminate = ref(false);

const checkItemNum = computed(() => {
  return props.checkItemList.length;
});

const allCheckItems = computed(() => {
  return props.checkItemList.map((item) => item.value);
});

onMounted(() => {
  updateCheckAllState(props.modelValue.length);
});

const handleCheckAllChange = () => {
  const checkedItems = checkAll.value ? allCheckItems.value : [];
  isIndeterminate.value = false;
  emit('update:modelValue', checkedItems);
};

const handleCheckedItemsChange = (value: CheckboxValueType[]) => {
  emit('update:modelValue', value);
  updateCheckAllState(value.length);
};

const updateCheckAllState = (checkedCount: number) => {
  checkAll.value = checkedCount === checkItemNum.value;
  isIndeterminate.value = checkedCount > 0 && checkedCount < checkItemNum.value;
};
</script>

<template>
  <ElSpace>
    <ElCheckbox v-model="checkAll" :indeterminate="isIndeterminate" @change="handleCheckAllChange">
      {{ $t('common.checkAll') }}
    </ElCheckbox>
    <ElDivider direction="vertical" />
    <ElCheckboxGroup :model-value="modelValue" @change="handleCheckedItemsChange">
      <ElCheckbox v-for="(item, index) in checkItemList" :key="index" :label="item.value">
        {{ item.label }}
      </ElCheckbox>
    </ElCheckboxGroup>
  </ElSpace>
</template>
