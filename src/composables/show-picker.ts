import { computed, ref } from 'vue';

import { addUnit } from '@/utils';

import type { CSSProperties } from 'vue';
import type { Coordinates } from '@/types';

export const useShowPicker = (handleShow: () => void) => {
  const pickerLeft = ref(0);
  const pickerTop = ref(0);

  const pickerStyle = computed<CSSProperties>(() => {
    return {
      zIndex: 2100,
      position: 'fixed',
      left: addUnit(pickerLeft.value + 1),
      top: addUnit(pickerTop.value - 2),
    };
  });

  const showPicker = (coords: Coordinates) => {
    pickerLeft.value = coords.left;
    pickerTop.value = coords.top;
    setTimeout(handleShow, 50);
  };

  return {
    pickerStyle,
    showPicker,
  };
};
