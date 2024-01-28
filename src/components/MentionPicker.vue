<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElSelect } from 'element-plus';

import type { ElScrollbar } from 'element-plus';

interface Props {
  uidList: string[];
}

defineProps<Props>();

const emit = defineEmits<{
  picked: [uid: string];
  hide: [];
}>();

const select = ref<InstanceType<typeof ElSelect> | null>(null);
const isPickerVisible = ref(false);

onMounted(() => {
  initPicker();
});

const initPicker = () => {
  const input = select.value?.reference?.input;

  input?.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      handleUidSelect(input.value);
    } else if (e.key === 'Backspace' && input.value === '') {
      select.value?.blur();
    }
  });
};

const showPicker = () => {
  isPickerVisible.value = true;

  setTimeout(() => {
    select.value?.focus();
  });
};

const handlePickerFocus = () => {
  setTimeout(() => {
    const scrollbar = select.value?.scrollbar as InstanceType<typeof ElScrollbar> | null | undefined;
    scrollbar?.setScrollTop(0);
  });
};

const handleUidSelect = (uid: string) => {
  emit('picked', uid);
};

const handleVisibleChange = (visible: boolean) => {
  if (visible) {
    return;
  }

  setTimeout(() => {
    isPickerVisible.value = false;
    emit('hide');
  }, 250);
};

defineExpose({
  showPicker,
});
</script>

<template>
  <ElSelect
    v-show="isPickerVisible"
    ref="select"
    :placeholder="$t('enhancedTopic.mentionWho')"
    popper-class="mention-popper"
    filterable
    allow-create
    default-first-option
    @focus="handlePickerFocus"
    @change="handleUidSelect"
    @visible-change="handleVisibleChange"
  >
    <ElOption v-for="item in uidList" :key="item" :value="item" />
  </ElSelect>
</template>

<style lang="scss">
.mention-popper {
  .el-select-dropdown__item {
    &:hover,
    &.hover {
      color: var(--el-color-primary);
    }
  }
}
</style>
