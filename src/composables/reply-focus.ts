import { onMounted, onUnmounted } from 'vue';

import { SELECTOR_ENHANCED_REPLY_ITEM } from '@/constants/selector';

const REPLY_FLASH_CLASS = 'gzkp-reply-item-flash';
const REPLY_FOCUS_TIMEOUT = 10_000;

interface UseReplyFocusResult {
  focusReplyFromHash: () => void;
}

const focusReplyElement = (replyElement: HTMLElement) => {
  replyElement.scrollIntoView({ block: 'center' });
  replyElement.classList.remove(REPLY_FLASH_CLASS);

  window.requestAnimationFrame(() => {
    replyElement.classList.add(REPLY_FLASH_CLASS);
  });
  replyElement.addEventListener(
    'animationend',
    () => {
      replyElement.classList.remove(REPLY_FLASH_CLASS);
    },
    { once: true },
  );
};

export const focusRenderedReply = (container: ParentNode, replyId: string): boolean => {
  const replyElement = Array.from(container.querySelectorAll<HTMLElement>(SELECTOR_ENHANCED_REPLY_ITEM)).find(
    (element) => {
      return element.dataset.gzkpReplyId === replyId && element.getClientRects().length > 0;
    },
  );

  if (!replyElement) {
    return false;
  }

  focusReplyElement(replyElement);
  return true;
};

export const useReplyFocus = (): UseReplyFocusResult => {
  let replyFocusObserver: MutationObserver | undefined;
  let replyFocusTimer: number | undefined;

  const clearReplyFocus = () => {
    replyFocusObserver?.disconnect();
    replyFocusObserver = undefined;
    window.clearTimeout(replyFocusTimer);
    replyFocusTimer = undefined;
  };

  const getHashReplyId = (): string | undefined => {
    return window.location.hash.match(/^#(?:r|reply-)(\d+)$/)?.[1];
  };

  const focusReplyFromHash = () => {
    clearReplyFocus();

    const replyId = getHashReplyId();

    if (!replyId) {
      return;
    }

    let nativeReplyFocused = false;

    const focusReply = (): boolean => {
      const dialog = document.querySelector('.gzkp-topic-dialog');

      if (dialog && focusRenderedReply(dialog, replyId)) {
        clearReplyFocus();
        return true;
      }

      const nativeReplyElement = document.getElementById(`r${replyId}`);

      if (nativeReplyElement && !nativeReplyFocused) {
        nativeReplyFocused = true;
        focusReplyElement(nativeReplyElement);
      }

      return false;
    };

    if (focusReply()) {
      return;
    }

    replyFocusObserver = new MutationObserver(() => {
      focusReply();
    });
    replyFocusObserver.observe(document.body, { childList: true, subtree: true });
    replyFocusTimer = window.setTimeout(clearReplyFocus, REPLY_FOCUS_TIMEOUT);
  };

  onMounted(() => {
    focusReplyFromHash();
    window.addEventListener('hashchange', focusReplyFromHash);
  });

  onUnmounted(() => {
    clearReplyFocus();
    window.removeEventListener('hashchange', focusReplyFromHash);
  });

  return {
    focusReplyFromHash,
  };
};
