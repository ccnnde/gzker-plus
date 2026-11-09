import { onMounted, onUnmounted } from 'vue';

import { t } from '@/i18n';
import { blurActiveElement } from '@/utils';
import { SELECTOR_MOBILE_SEARCH_LINK, SELECTOR_SEARCH_FORM } from '@/constants/selector';

const SHORTCUT_ELEMENT_CLASS = 'gzkp-search-shortcut';
const SEARCH_FORM_ENHANCED_CLASS = 'gzkp-search-enhanced';

interface UseSearchTriggerOptions {
  onOpen: () => void;
}

interface UseSearchTriggerResult {
  setTriggerExpanded: (expanded: boolean) => void;
}

export const useSearchTrigger = ({ onOpen }: UseSearchTriggerOptions): UseSearchTriggerResult => {
  let desktopSearchForm: HTMLFormElement | null = null;
  let desktopSearchInput: HTMLInputElement | null = null;
  let mobileSearchLink: HTMLAnchorElement | null = null;
  let shortcutElement: HTMLSpanElement | null = null;
  let originalPlaceholder = '';
  let originalReadOnly = false;
  let originalInputHasPopup: string | null = null;
  let originalInputExpanded: string | null = null;
  let originalMobileHasPopup: string | null = null;
  let originalMobileExpanded: string | null = null;
  let isTriggerExpanded = false;

  const restoreAttribute = (element: Element, name: string, value: string | null) => {
    if (value === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, value);
    }
  };

  const setTriggerExpanded = (expanded: boolean) => {
    isTriggerExpanded = expanded;
    const value = String(expanded);

    desktopSearchInput?.setAttribute('aria-expanded', value);
    mobileSearchLink?.setAttribute('aria-expanded', value);
  };

  const handleOpenTrigger = (event: Event) => {
    event.preventDefault();

    if (isTriggerExpanded) {
      return;
    }

    blurActiveElement();
    onOpen();
  };

  const handleSearchInputFocus = () => {
    desktopSearchInput?.blur();

    if (!isTriggerExpanded) {
      onOpen();
    }
  };

  const createShortcutElement = (): HTMLSpanElement => {
    const element = document.createElement('span');
    const keyElement = document.createElement('kbd');
    const iconElement = document.createElement('span');

    element.className = SHORTCUT_ELEMENT_CLASS;
    element.setAttribute('aria-hidden', 'true');
    iconElement.className = 'i-gzkp-slash';

    keyElement.append(iconElement);
    element.append(keyElement);

    return element;
  };

  const setupSearchTriggers = () => {
    desktopSearchForm = document.querySelector<HTMLFormElement>(SELECTOR_SEARCH_FORM);
    desktopSearchInput = desktopSearchForm?.querySelector<HTMLInputElement>('input[name="q"]') || null;
    mobileSearchLink = document.querySelector<HTMLAnchorElement>(SELECTOR_MOBILE_SEARCH_LINK);

    if (desktopSearchForm && desktopSearchInput) {
      originalPlaceholder = desktopSearchInput.placeholder;
      originalReadOnly = desktopSearchInput.readOnly;
      originalInputHasPopup = desktopSearchInput.getAttribute('aria-haspopup');
      originalInputExpanded = desktopSearchInput.getAttribute('aria-expanded');
      desktopSearchInput.placeholder = t('search.shortPlaceholder');
      desktopSearchInput.readOnly = true;
      desktopSearchInput.setAttribute('aria-haspopup', 'dialog');
      desktopSearchInput.setAttribute('aria-expanded', 'false');
      desktopSearchForm.classList.add(SEARCH_FORM_ENHANCED_CLASS);
      desktopSearchInput.addEventListener('focus', handleSearchInputFocus);
      desktopSearchForm.addEventListener('click', handleOpenTrigger);
      desktopSearchForm.addEventListener('submit', handleOpenTrigger);

      shortcutElement = createShortcutElement();
      desktopSearchForm.append(shortcutElement);
    }

    if (mobileSearchLink) {
      originalMobileHasPopup = mobileSearchLink.getAttribute('aria-haspopup');
      originalMobileExpanded = mobileSearchLink.getAttribute('aria-expanded');
      mobileSearchLink.setAttribute('aria-haspopup', 'dialog');
      mobileSearchLink.setAttribute('aria-expanded', 'false');
      mobileSearchLink.addEventListener('click', handleOpenTrigger);
    }
  };

  const removeSearchTriggers = () => {
    if (desktopSearchForm && desktopSearchInput) {
      desktopSearchInput.removeEventListener('focus', handleSearchInputFocus);
      desktopSearchForm.removeEventListener('click', handleOpenTrigger);
      desktopSearchForm.removeEventListener('submit', handleOpenTrigger);
      desktopSearchForm.classList.remove(SEARCH_FORM_ENHANCED_CLASS);
      desktopSearchInput.placeholder = originalPlaceholder;
      desktopSearchInput.readOnly = originalReadOnly;
      restoreAttribute(desktopSearchInput, 'aria-haspopup', originalInputHasPopup);
      restoreAttribute(desktopSearchInput, 'aria-expanded', originalInputExpanded);
    }

    if (mobileSearchLink) {
      mobileSearchLink.removeEventListener('click', handleOpenTrigger);
      restoreAttribute(mobileSearchLink, 'aria-haspopup', originalMobileHasPopup);
      restoreAttribute(mobileSearchLink, 'aria-expanded', originalMobileExpanded);
    }

    shortcutElement?.remove();
  };

  onMounted(() => {
    setupSearchTriggers();
  });

  onUnmounted(() => {
    removeSearchTriggers();
  });

  return {
    setTriggerExpanded,
  };
};
