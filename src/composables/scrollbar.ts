import { ref } from 'vue';

import type { ElScrollbar } from 'element-plus';

export const useScrollbar = () => {
  const scrollbar = ref<InstanceType<typeof ElScrollbar> | null>(null);

  const getScrollBehavior = (smooth: boolean): ScrollBehavior => {
    return smooth ? 'smooth' : 'auto';
  };

  const scrollToTop = (smooth: boolean = true) => {
    scrollbar.value?.scrollTo({
      top: 0,
      behavior: getScrollBehavior(smooth),
    });
  };

  const scrollToBottom = (smooth: boolean = true) => {
    scrollbar.value?.scrollTo({
      top: scrollbar.value.wrapRef?.scrollHeight,
      behavior: getScrollBehavior(smooth),
    });
  };

  return {
    scrollbar,
    scrollToTop,
    scrollToBottom,
  };
};
