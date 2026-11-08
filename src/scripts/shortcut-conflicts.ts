import { isForumShortcutEvent, isIgnoredForumShiftKey } from '@/utils/forum-shortcuts';
import { SELECTOR_OPEN_SHORTCUT_DIALOG } from '@/constants/selector';

import type { ContentScriptContext } from 'wxt/utils/content-script-context';

const FORUM_SHORTCUT_KEY = /^[/?bcefghlmnrstz]$/i;

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && document.querySelector(SELECTOR_OPEN_SHORTCUT_DIALOG)) {
    // Leave the browser's dialog dismissal intact while shielding the dialog underneath.
    event.stopPropagation();
    return;
  }

  if (!FORUM_SHORTCUT_KEY.test(event.key) || !isForumShortcutEvent(event) || isIgnoredForumShiftKey(event)) {
    return;
  }

  const hasOpenModal = [...document.querySelectorAll<HTMLElement>('.el-overlay:not(.gzkp-topic-overlay)')].some(
    (overlay) => {
      return overlay.style.display !== 'none';
    },
  );

  if (hasOpenModal) {
    // The forum's key handler ignores events whose default action is already prevented.
    event.preventDefault();
  }
};

export const isolateForumShortcuts = (context: ContentScriptContext): void => {
  document.addEventListener('keydown', handleKeydown, true);

  context.onInvalidated(() => {
    document.removeEventListener('keydown', handleKeydown, true);
  });
};
