import { onUnmounted } from 'vue';

import { isGlobalLoadingVisible } from '@/utils';
import { isImgViewerVisible } from '@/utils/img-viewer';

import type { Ref } from 'vue';
import type { ElScrollbar } from 'element-plus';

interface UseTopicKeyboardScrollOptions {
  scrollbar: Ref<InstanceType<typeof ElScrollbar> | null>;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollBy: (options: ScrollToOptions) => void;
}

interface UseTopicKeyboardScrollResult {
  startKeyboardScroll: () => void;
  stopKeyboardScroll: () => void;
}

const ARROW_SCROLL_DISTANCE = 50;

export const useTopicKeyboardScroll = ({
  scrollbar,
  scrollToTop,
  scrollToBottom,
  scrollBy,
}: UseTopicKeyboardScrollOptions): UseTopicKeyboardScrollResult => {
  const handleKeydown = (event: KeyboardEvent) => {
    if (isImgViewerVisible() || isGlobalLoadingVisible()) {
      return;
    }

    const wrapRef = scrollbar.value?.wrapRef;

    if (!wrapRef) {
      return;
    }

    // 如果同时有多个对话框，不处理快捷键
    const overlayElements = [...document.querySelectorAll<HTMLElement>('.el-overlay')].filter(
      (item) => item.style.display !== 'none',
    );

    if (overlayElements.length > 1) {
      return;
    }

    // 如果焦点在输入框中，不处理快捷键
    const activeElement = document.activeElement;

    if (
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.tagName === 'BUTTON' ||
      activeElement?.closest('.cherry-editor') ||
      activeElement?.closest('.el-select__wrapper') ||
      activeElement?.closest('.el-dropdown') ||
      activeElement?.closest('.el-dropdown__popper')
    ) {
      return;
    }

    // PageUp/PageDown/Space 滚动距离为视口高度的 90%
    const pageScrollDistance = wrapRef.clientHeight * 0.9;

    switch (event.key) {
      case 'Home':
        event.preventDefault();
        scrollToTop();
        break;
      case 'End':
        event.preventDefault();
        scrollToBottom();
        break;
      case 'PageUp':
        event.preventDefault();
        scrollBy({ top: -pageScrollDistance });
        break;
      case 'PageDown':
        event.preventDefault();
        scrollBy({ top: pageScrollDistance });
        break;
      case 'ArrowUp':
        event.preventDefault();
        scrollBy({ top: -ARROW_SCROLL_DISTANCE });
        break;
      case 'ArrowDown':
        event.preventDefault();
        scrollBy({ top: ARROW_SCROLL_DISTANCE });
        break;
      case ' ':
        event.preventDefault();
        scrollBy({ top: event.shiftKey ? -pageScrollDistance : pageScrollDistance });
        break;
    }
  };

  const startKeyboardScroll = () => {
    document.addEventListener('keydown', handleKeydown);
  };

  const stopKeyboardScroll = () => {
    document.removeEventListener('keydown', handleKeydown);
  };

  onUnmounted(() => {
    stopKeyboardScroll();
  });

  return {
    startKeyboardScroll,
    stopKeyboardScroll,
  };
};
