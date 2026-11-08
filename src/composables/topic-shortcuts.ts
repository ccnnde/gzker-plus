import { onMounted, onUnmounted } from 'vue';

import { isForumShortcutEvent, isIgnoredForumShiftKey } from '@/utils/forum-shortcuts';
import { SELECTOR_OPEN_SHORTCUT_DIALOG, SELECTOR_SHORTCUT_ENABLED_CHECKBOX } from '@/constants/selector';

import type { Ref } from 'vue';

interface TopicShortcutOptions {
  container: Ref<HTMLDivElement | null>;
  isActive: () => boolean;
  favorite: () => void;
  like: () => void;
  reply: () => void;
  scrollToTop: () => void;
  editTopic: () => void;
  editReply: () => void;
  createTopic: () => void;
}

const FORUM_SHORTCUT_PREFERENCE = 'gzk:keyboard-shortcuts:v1';
const FORUM_SHORTCUT_PREFIX_TIMEOUT = 1400;

const readForumShortcutPreference = () => {
  try {
    return localStorage.getItem(FORUM_SHORTCUT_PREFERENCE) !== 'off';
  } catch {
    return true;
  }
};

const initialForumShortcutsEnabled = readForumShortcutPreference();

const areForumShortcutsEnabled = () => {
  const checkbox = document.querySelector<HTMLInputElement>(SELECTOR_SHORTCUT_ENABLED_CHECKBOX);

  return checkbox?.checked ?? initialForumShortcutsEnabled;
};

export const useTopicShortcuts = ({
  container,
  isActive,
  favorite,
  like,
  reply,
  scrollToTop,
  editTopic,
  editReply,
  createTopic,
}: TopicShortcutOptions): void => {
  const desktop = window.matchMedia('(min-width: 992px)');
  const actions = new Map([
    ['b', favorite],
    ['l', like],
    ['r', reply],
    ['gt', scrollToTop],
    ['et', editTopic],
    ['er', editReply],
    ['c', createTopic],
  ]);
  let prefix = '';
  let prefixExpiresAt = 0;

  const resetPrefix = () => {
    prefix = '';
    prefixExpiresAt = 0;
  };

  const hasBlockingOverlay = (topicOverlay?: Element | null) => {
    return [...document.querySelectorAll<HTMLElement>('.el-overlay')].some((overlay) => {
      return overlay !== topicOverlay && overlay.style.display !== 'none';
    });
  };

  const handleKeydown = (event: KeyboardEvent) => {
    const topicOverlay = isActive() ? container.value?.closest('.el-overlay') : null;

    if (
      !desktop.matches ||
      !isForumShortcutEvent(event) ||
      !areForumShortcutsEnabled() ||
      document.querySelector(SELECTOR_OPEN_SHORTCUT_DIALOG) ||
      hasBlockingOverlay(topicOverlay)
    ) {
      resetPrefix();
      return;
    }

    if (isIgnoredForumShiftKey(event)) {
      return;
    }

    const key = event.key.toLowerCase();
    const now = performance.now();
    const sequence = now < prefixExpiresAt ? prefix + key : key;
    resetPrefix();

    if (sequence === 'g' || sequence === 'e') {
      prefix = sequence;
      prefixExpiresAt = now + FORUM_SHORTCUT_PREFIX_TIMEOUT;
      return;
    }

    const action = actions.get(sequence);

    if (action && (topicOverlay || sequence === 'c')) {
      event.preventDefault();
      action();
    }
  };

  onMounted(() => {
    // Run before the document capture guard and the forum's key handler.
    window.addEventListener('keydown', handleKeydown, true);
    window.addEventListener('blur', resetPrefix);
    document.addEventListener('visibilitychange', resetPrefix);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown, true);
    window.removeEventListener('blur', resetPrefix);
    document.removeEventListener('visibilitychange', resetPrefix);
  });
};
