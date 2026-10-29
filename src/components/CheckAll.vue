<script setup lang="ts" generic="T extends string">
import { computed, onMounted, ref, watch } from 'vue';

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

watch(
  () => props.modelValue.length,
  () => {
    updateCheckAllState(props.modelValue.length);
  },
);

onMounted(() => {
  updateCheckAllState(props.modelValue.length);
});

const handleCheckAllChange = () => {
  const checkedItems = checkAll.value ? allCheckItems.value : [];
  emit('update:modelValue', checkedItems);
};

const handleCheckedItemsChange = (value: CheckboxValueType[]) => {
  emit('update:modelValue', value);
};

const updateCheckAllState = (checkedCount: number) => {
  checkAll.value = checkedCount === checkItemNum.value;
  isIndeterminate.value = checkedCount > 0 && checkedCount < checkItemNum.value;
};
</script>

<template>
  <div class="check-all-container">
    <div class="check-all">
      <ElCheckbox v-model="checkAll" :indeterminate="isIndeterminate" @change="handleCheckAllChange">
        {{ $t('common.checkAll') }}
      </ElCheckbox>
      <ElDivider class="check-all__divider" direction="vertical" />
      <ElCheckboxGroup class="check-all__items" :model-value="modelValue" @change="handleCheckedItemsChange">
        <ElCheckbox v-for="(item, index) in checkItemList" :key="index" :value="item.value">
          {{ item.label }}
        </ElCheckbox>
      </ElCheckboxGroup>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.check-all-container {
  container-type: inline-size;
}

.check-all {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 17px;
  align-items: center;

  :deep(.el-checkbox) {
    margin-right: 0;
  }
}

.check-all__divider {
  margin: 0;
}

.check-all__items {
  display: contents;
}

@container (width < 360px) {
  .check-all {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .check-all__divider {
    display: none;
  }

  .check-all__items {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>
