import { nextTick, onMounted, ref } from 'vue';

import type { SelectInstance } from 'element-plus';

export const useEditorPicker = (handleSelect: ((val: string) => void) | undefined, handleHide: () => void) => {
  const select = ref<SelectInstance | null>(null);
  const isPickerVisible = ref(false);

  onMounted(() => {
    initPicker();
  });

  const initPicker = () => {
    const input = select.value?.inputRef;

    input?.addEventListener('keydown', (e: KeyboardEvent) => {
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

    nextTick(() => {
      select.value?.focus();
    });
  };

  const handleFocus = () => {
    setTimeout(() => {
      select.value?.scrollbarRef?.setScrollTop(0);
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
