<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { SELECTOR_USER_INFO_TRIGGER } from '@/constants/selector';

import UserInfoPopover from './UserInfoPopover.vue';

interface Props {
  container: HTMLDivElement | null;
}

const props = defineProps<Props>();

const SHOW_DELAY = 300;
const HIDE_DELAY = 200;

const visible = ref<boolean>(false);
const referenceElement = ref<HTMLElement>();
const uid = ref<string>('');

let showTimer: number | undefined;
let hideTimer: number | undefined;
let pointerTrigger: HTMLElement | undefined;
let focusedTrigger: HTMLElement | undefined;
let pointerInsidePopover = false;
let focusInsidePopover = false;

const clearShowTimer = (): void => {
  window.clearTimeout(showTimer);
  showTimer = undefined;
};

const clearHideTimer = (): void => {
  window.clearTimeout(hideTimer);
  hideTimer = undefined;
};

const getTriggerElement = (target: EventTarget | null): HTMLElement | undefined => {
  if (!(target instanceof Element)) {
    return undefined;
  }

  const triggerElement = target.closest<HTMLElement>(SELECTOR_USER_INFO_TRIGGER);
  const container = props.container;

  if (!triggerElement || !container?.contains(triggerElement) || !triggerElement.dataset.userUid) {
    return undefined;
  }

  return triggerElement;
};

const isSameTriggerTarget = (triggerElement: HTMLElement, relatedTarget: EventTarget | null): boolean => {
  return relatedTarget instanceof Node && triggerElement.contains(relatedTarget);
};

const isActiveTrigger = (triggerElement: HTMLElement | undefined): boolean => {
  return Boolean(
    triggerElement?.isConnected &&
      triggerElement.dataset.userUid === uid.value &&
      props.container?.contains(triggerElement),
  );
};

const canKeepOpen = (): boolean => {
  return (
    pointerInsidePopover || focusInsidePopover || isActiveTrigger(pointerTrigger) || isActiveTrigger(focusedTrigger)
  );
};

const close = (): void => {
  clearShowTimer();
  clearHideTimer();
  pointerTrigger = undefined;
  focusedTrigger = undefined;
  pointerInsidePopover = false;
  focusInsidePopover = false;
  visible.value = false;
};

const scheduleShow = (): void => {
  if (showTimer !== undefined) {
    return;
  }

  const pendingShowTimer = window.setTimeout(async () => {
    await nextTick();

    const currentReferenceElement = referenceElement.value;

    if (
      showTimer !== pendingShowTimer ||
      !currentReferenceElement?.isConnected ||
      !props.container?.contains(currentReferenceElement)
    ) {
      return;
    }

    visible.value = true;
    showTimer = undefined;
  }, SHOW_DELAY);

  showTimer = pendingShowTimer;
};

const show = (triggerElement: HTMLElement): void => {
  const nextUid = triggerElement.dataset.userUid;

  if (!nextUid) {
    return;
  }

  clearHideTimer();

  if (uid.value === nextUid) {
    referenceElement.value = triggerElement;

    if (!visible.value) {
      scheduleShow();
    }

    return;
  }

  clearShowTimer();
  visible.value = false;
  referenceElement.value = triggerElement;
  uid.value = nextUid;
  scheduleShow();
};

const hide = (triggerElement?: HTMLElement): void => {
  if (triggerElement && referenceElement.value !== triggerElement) {
    return;
  }

  clearShowTimer();
  clearHideTimer();

  hideTimer = window.setTimeout(() => {
    hideTimer = undefined;

    if (canKeepOpen()) {
      return;
    }

    visible.value = false;
  }, HIDE_DELAY);
};

const handleTriggerEnter = (event: MouseEvent | FocusEvent): void => {
  const triggerElement = getTriggerElement(event.target);

  if (!triggerElement || isSameTriggerTarget(triggerElement, event.relatedTarget)) {
    return;
  }

  if (event instanceof MouseEvent) {
    pointerTrigger = triggerElement;
  } else {
    focusedTrigger = triggerElement;
  }

  show(triggerElement);
};

const handleTriggerLeave = (event: MouseEvent | FocusEvent): void => {
  const triggerElement = getTriggerElement(event.target);

  if (!triggerElement || isSameTriggerTarget(triggerElement, event.relatedTarget)) {
    return;
  }

  const relatedTriggerElement = getTriggerElement(event.relatedTarget);

  if (event instanceof MouseEvent) {
    pointerTrigger = relatedTriggerElement;
  } else {
    focusedTrigger = relatedTriggerElement;
  }

  if (relatedTriggerElement) {
    show(relatedTriggerElement);
    return;
  }

  hide(triggerElement);
};

const handleContentMouseEnter = (): void => {
  pointerInsidePopover = true;
  clearHideTimer();
};

const handleContentMouseLeave = (): void => {
  pointerInsidePopover = false;
  hide();
};

const handleContentFocusIn = (): void => {
  focusInsidePopover = true;
  clearHideTimer();
};

const handleContentFocusOut = (event: FocusEvent): void => {
  const currentTarget = event.currentTarget;

  if (
    currentTarget instanceof Node &&
    event.relatedTarget instanceof Node &&
    currentTarget.contains(event.relatedTarget)
  ) {
    return;
  }

  focusInsidePopover = false;
  hide();
};

const addContainerListeners = (container: HTMLDivElement): void => {
  container.addEventListener('mouseover', handleTriggerEnter);
  container.addEventListener('mouseout', handleTriggerLeave);
  container.addEventListener('focusin', handleTriggerEnter);
  container.addEventListener('focusout', handleTriggerLeave);
};

const removeContainerListeners = (container: HTMLDivElement): void => {
  container.removeEventListener('mouseover', handleTriggerEnter);
  container.removeEventListener('mouseout', handleTriggerLeave);
  container.removeEventListener('focusin', handleTriggerEnter);
  container.removeEventListener('focusout', handleTriggerLeave);
};

watch(
  () => props.container,
  (container, previousContainer) => {
    if (previousContainer) {
      removeContainerListeners(previousContainer);
    }

    close();

    if (container) {
      addContainerListeners(container);
    }
  },
  {
    immediate: true,
  },
);

onMounted(() => {
  window.addEventListener('blur', close);
});

onUnmounted(() => {
  if (props.container) {
    removeContainerListeners(props.container);
  }

  window.removeEventListener('blur', close);
  close();
});
</script>

<template>
  <UserInfoPopover
    :uid="uid"
    :visible="visible"
    :virtual-ref="referenceElement"
    virtual-triggering
    :persistent="false"
    teleported
    @content-mouseenter="handleContentMouseEnter"
    @content-mouseleave="handleContentMouseLeave"
    @content-focusin="handleContentFocusIn"
    @content-focusout="handleContentFocusOut"
  />
</template>
