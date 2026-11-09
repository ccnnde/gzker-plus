import { nextTick, onMounted, onUnmounted, ref } from 'vue';

import type { SelectInstance } from 'element-plus';

export const useEditorPicker = (handleSelect: ((val: string) => void) | undefined, handleHide: () => void) => {
  const select = ref<SelectInstance | null>(null);
  const isPickerVisible = ref(false);
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  onMounted(() => {
    initPicker();
  });

  onUnmounted(() => {
    clearTimeout(hideTimer);
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
    clearTimeout(hideTimer);
    isPickerVisible.value = true;

    nextTick(() => {
      select.value?.focus();
    });
  };

  const hidePicker = () => {
    if (!isPickerVisible.value) {
      return false;
    }

    clearTimeout(hideTimer);
    isPickerVisible.value = false;
    select.value?.blur();
    handleHide();
    return true;
  };

  const handleFocus = () => {
    setTimeout(() => {
      select.value?.scrollbarRef?.setScrollTop(0);
    });
  };

  const handleVisibleChange = (visible: boolean) => {
    if (visible || !isPickerVisible.value) {
      return;
    }

    clearTimeout(hideTimer);
    hideTimer = setTimeout(hidePicker, 250);
  };

  return {
    select,
    isPickerVisible,
    showPicker,
    hidePicker,
    handleFocus,
    handleVisibleChange,
  };
};
