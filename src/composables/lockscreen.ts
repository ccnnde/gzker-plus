import { computed } from 'vue';
import { useNamespace } from 'element-plus';
import { addClass, getScrollBarWidth, getStyle, hasClass, removeClass } from 'element-plus/es/utils/index.mjs';

// 修改自 element-plus/es/hooks/use-lockscreen/index.ts
export const useLockscreen = () => {
  const ns = useNamespace('popup');
  const hiddenClassName = computed(() => ns.bm('parent', 'hidden'));

  let scrollBarWidth = 0;
  let withoutHiddenClass = false;
  let bodyWidth = '0';

  const lockScroll = () => {
    withoutHiddenClass = !hasClass(document.body, hiddenClassName.value);

    if (withoutHiddenClass) {
      bodyWidth = document.body.style.width;
    }

    scrollBarWidth = getScrollBarWidth(ns.namespace.value);

    const bodyHasOverflow = document.documentElement.clientHeight < document.body.scrollHeight;
    const bodyOverflowY = getStyle(document.body, 'overflowY');

    if (scrollBarWidth > 0 && (bodyHasOverflow || bodyOverflowY === 'scroll') && withoutHiddenClass) {
      document.body.style.width = `calc(100% - ${scrollBarWidth}px)`;
    }

    addClass(document.body, hiddenClassName.value);
  };

  const unlockScroll = () => {
    setTimeout(() => {
      removeClass(document.body, hiddenClassName.value);

      if (withoutHiddenClass) {
        document.body.style.width = bodyWidth;
      }
    }, 200);
  };

  return {
    lockScroll,
    unlockScroll,
  };
};
