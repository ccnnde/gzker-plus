import { onMounted, ref } from 'vue';

import type { ElScrollbar, ElSelect } from 'element-plus';

export const useEditorPicker = (handleSelect: ((val: string) => void) | undefined, handleHide: () => void) => {
  const select = ref<InstanceType<typeof ElSelect> | null>(null);
  const isPickerVisible = ref(false);

  onMounted(() => {
    initPicker();
  });

  const initPicker = () => {
    const input = select.value?.reference?.input;

    input?.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        if (handleSelect) {
          e.preventDefault();
          handleSelect(input.value);
        }
      } else if (e.key === 'Backspace' && input.value === '') {
        select.value?.blur();
      }
    });
  };

  const showPicker = () => {
    isPickerVisible.value = true;
    select.value?.focus();
  };

  const handleFocus = () => {
    setTimeout(() => {
      const scrollbar = select.value?.scrollbar as InstanceType<typeof ElScrollbar> | null | undefined;
      scrollbar?.setScrollTop(0);
    });
  };

  const handleVisibleChange = (visible: boolean) => {
    if (visible) {
      return;
    }

    setTimeout(() => {
      isPickerVisible.value = false;
      handleHide();
    }, 250);
  };

  return {
    select,
    isPickerVisible,
    showPicker,
    handleFocus,
    handleVisibleChange,
  };
};
