<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, ref } from 'vue';
import { ElScrollbar } from 'element-plus';
import { debounce } from 'lodash-es';

import { useScrollbar } from '@/composables/scrollbar';
import { getReplyKey } from '@/utils';
import { viewerOptions, vViewer } from '@/utils/img-viewer';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import MentionReplyItem from './MentionReplyItem.vue';

import type Viewer from 'viewerjs';
import type { UserReplyItem } from '@/types';

const SHOW_DELAY = 150;
const HIDE_DELAY = 200;
const REPLY_NUMBER_SELECTOR = '[data-reply-no]';
const REPLY_FLASH_CLASS = 'mention-reply-item-flash';

const visible = ref<boolean>(false);
const positionReady = ref<boolean>(false);
const referenceElement = ref<HTMLAnchorElement>();
const mentionUid = computed<string>(() => {
  const mentionText = referenceElement.value?.textContent?.trim() || '';

  return mentionText.replace(/^@/, '');
});
const mentionRepliesContainer = ref<HTMLDivElement | null>(null);
const mentionReplies = ref<UserReplyItem[]>([]);
const focusReplyNo = ref<string>();
const { scrollbar } = useScrollbar();

let showTimer: number | undefined;
let hideTimer: number | undefined;
let positionFrame: number | undefined;
let pointerCheckFrame: number | undefined;
let pointerClientX: number | undefined;
let pointerClientY: number | undefined;
let pointerInsidePopover = false;
let imageViewerActive = false;

const clearShowTimer = (): void => {
  window.clearTimeout(showTimer);
  showTimer = undefined;
};

const clearHideTimer = (): void => {
  window.clearTimeout(hideTimer);
  hideTimer = undefined;
};

const clearPositionFrame = (): void => {
  if (positionFrame !== undefined) {
    window.cancelAnimationFrame(positionFrame);
  }

  positionFrame = undefined;
};

const clearPointerCheckFrame = (): void => {
  if (pointerCheckFrame !== undefined) {
    window.cancelAnimationFrame(pointerCheckFrame);
  }

  pointerCheckFrame = undefined;
};

const updateScrollbar = debounce((): void => {
  scrollbar.value?.update();
}, 500);

provide(UPDATE_SCROLLBAR_INJECTION_KEY, updateScrollbar);

const close = (): void => {
  clearShowTimer();
  clearHideTimer();
  clearPositionFrame();
  clearPointerCheckFrame();
  pointerInsidePopover = false;
  positionReady.value = false;
  visible.value = false;
};

const cancelHide = (): void => {
  clearHideTimer();
};

const updatePointerPosition = (event: MouseEvent): void => {
  pointerClientX = event.clientX;
  pointerClientY = event.clientY;
};

const isPopoverEventTarget = (target: EventTarget | null): boolean => {
  return target instanceof Node && Boolean(mentionRepliesContainer.value?.contains(target));
};

const isPointerOverPopover = (): boolean => {
  if (pointerClientX === undefined || pointerClientY === undefined) {
    return pointerInsidePopover;
  }

  const pointerTarget = document.elementFromPoint(pointerClientX, pointerClientY);

  return Boolean(pointerTarget && mentionRepliesContainer.value?.contains(pointerTarget));
};

const schedulePointerCheck = (): void => {
  clearPointerCheckFrame();
  pointerCheckFrame = window.requestAnimationFrame(() => {
    pointerCheckFrame = undefined;

    if (!visible.value || imageViewerActive) {
      return;
    }

    pointerInsidePopover = isPointerOverPopover();

    if (pointerInsidePopover) {
      cancelHide();
      return;
    }

    close();
  });
};

const getFocusedReplyElement = (): HTMLElement | undefined => {
  const replyElements = mentionRepliesContainer.value?.querySelectorAll<HTMLElement>(REPLY_NUMBER_SELECTOR) || [];

  return Array.from(replyElements).find(({ dataset }) => dataset.replyNo === focusReplyNo.value);
};

const positionFocusedReply = (): void => {
  const scrollbarElement = scrollbar.value?.wrapRef;
  const focusedReplyElement = getFocusedReplyElement();

  if (!scrollbarElement || !focusedReplyElement) {
    scrollbar.value?.setScrollTop(0);
    scrollbar.value?.update();
    return;
  }

  const scrollbarRect = scrollbarElement.getBoundingClientRect();
  const focusedReplyElementRect = focusedReplyElement.getBoundingClientRect();
  const focusedOffsetTop = focusedReplyElementRect.top - scrollbarRect.top + scrollbarElement.scrollTop;
  const targetScrollTop =
    focusedReplyElementRect.height >= scrollbarElement.clientHeight
      ? focusedOffsetTop
      : focusedOffsetTop - (scrollbarElement.clientHeight - focusedReplyElementRect.height) / 2;

  scrollbar.value?.setScrollTop(Math.max(0, targetScrollTop));
  scrollbar.value?.update();
};

const handleBeforeEnter = (): void => {
  clearPositionFrame();
  positionReady.value = false;
  scrollbar.value?.setScrollTop(0);

  positionFrame = window.requestAnimationFrame(() => {
    positionFrame = undefined;

    if (!visible.value) {
      return;
    }

    positionFocusedReply();
    positionReady.value = true;
  });
};

const flashFocusedReply = (): void => {
  if (mentionReplies.value.length <= 1) {
    return;
  }

  const focusedReplyElement = getFocusedReplyElement();

  if (!focusedReplyElement) {
    return;
  }

  focusedReplyElement.classList.remove(REPLY_FLASH_CLASS);
  focusedReplyElement.getBoundingClientRect();
  focusedReplyElement.classList.add(REPLY_FLASH_CLASS);
};

const handleAfterEnter = (): void => {
  flashFocusedReply();
};

const handleWindowScroll = (event: Event): void => {
  if (!visible.value && showTimer === undefined) {
    return;
  }

  if (imageViewerActive || isPopoverEventTarget(event.target)) {
    return;
  }

  if (!pointerInsidePopover) {
    close();
    return;
  }

  schedulePointerCheck();
};

const handleWindowWheel = (event: WheelEvent): void => {
  if (!visible.value && showTimer === undefined) {
    return;
  }

  updatePointerPosition(event);

  if (imageViewerActive) {
    return;
  }

  pointerInsidePopover = isPointerOverPopover();

  if (pointerInsidePopover) {
    cancelHide();
    return;
  }

  close();
};

const handleWindowResize = (): void => {
  if (imageViewerActive) {
    return;
  }

  close();
};

const hide = (targetElement?: HTMLAnchorElement): void => {
  if (targetElement && referenceElement.value !== targetElement) {
    return;
  }

  clearShowTimer();
  clearHideTimer();

  if (imageViewerActive) {
    return;
  }

  hideTimer = window.setTimeout(() => {
    if (imageViewerActive || pointerInsidePopover) {
      hideTimer = undefined;
      return;
    }

    clearPositionFrame();
    positionReady.value = false;
    visible.value = false;
    hideTimer = undefined;
  }, HIDE_DELAY);
};

const handlePopoverMouseEnter = (event: MouseEvent): void => {
  updatePointerPosition(event);
  pointerInsidePopover = true;
  clearPointerCheckFrame();
  cancelHide();
};

const handlePopoverMouseLeave = (event: MouseEvent): void => {
  updatePointerPosition(event);
  pointerInsidePopover = false;

  if (!imageViewerActive) {
    hide();
  }
};

const handleViewerPointerMove = (event: PointerEvent): void => {
  updatePointerPosition(event);
};

const handleImageViewerShow = (): void => {
  imageViewerActive = true;
  clearHideTimer();
  clearPointerCheckFrame();
  window.addEventListener('pointermove', handleViewerPointerMove, {
    passive: true,
  });
};

const handleImageViewerHidden = (): void => {
  window.removeEventListener('pointermove', handleViewerPointerMove);
  imageViewerActive = false;
  schedulePointerCheck();
};

const popoverViewerOptions: Viewer.Options = {
  ...viewerOptions,
  show: handleImageViewerShow,
  hidden: handleImageViewerHidden,
};

const show = (targetElement: HTMLAnchorElement, nextReplies: UserReplyItem[], nextFocusReplyNo?: string): void => {
  clearShowTimer();
  clearHideTimer();

  if (!targetElement.isConnected || !nextReplies.length) {
    close();
    return;
  }

  if (referenceElement.value !== targetElement) {
    visible.value = false;
  }

  referenceElement.value = targetElement;
  mentionReplies.value = nextReplies;
  focusReplyNo.value = nextFocusReplyNo;

  const pendingShowTimer = window.setTimeout(async () => {
    await nextTick();

    if (showTimer !== pendingShowTimer || referenceElement.value !== targetElement || !targetElement.isConnected) {
      return;
    }

    visible.value = true;
    showTimer = undefined;
  }, SHOW_DELAY);

  showTimer = pendingShowTimer;
};

onMounted(() => {
  window.addEventListener('scroll', handleWindowScroll, true);
  window.addEventListener('wheel', handleWindowWheel, {
    capture: true,
    passive: true,
  });
  window.addEventListener('resize', handleWindowResize);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleWindowScroll, true);
  window.removeEventListener('wheel', handleWindowWheel, true);
  window.removeEventListener('resize', handleWindowResize);
  window.removeEventListener('pointermove', handleViewerPointerMove);
  close();
  updateScrollbar.cancel();
});

defineExpose({
  hide,
  show,
});
</script>

<template>
  <ElPopover
    :visible="visible"
    :virtual-ref="referenceElement"
    width="min(420px, calc(100vw - 32px))"
    popper-class="mention-replies-popover"
    :popper-style="{ padding: 0 }"
    :z-index="2001"
    placement="top-start"
    virtual-triggering
    teleported
    @before-enter="handleBeforeEnter"
    @after-enter="handleAfterEnter"
  >
    <div
      ref="mentionRepliesContainer"
      v-viewer="popoverViewerOptions"
      :class="['mention-replies-popover-container', { 'mention-replies-popover-container-ready': positionReady }]"
      @mouseenter="handlePopoverMouseEnter"
      @mouseleave="handlePopoverMouseLeave"
      @focusin="cancelHide"
      @focusout="hide()"
    >
      <div class="mention-replies-popover-header">
        <span class="mention-replies-popover-title">
          {{ $t('enhancedTopic.mentionRepliesTitle', { uid: mentionUid }) }}
        </span>
      </div>
      <ElScrollbar ref="scrollbar" max-height="min(40vh, 360px)">
        <ul class="mention-replies-popover-list">
          <MentionReplyItem
            v-for="(item, index) in mentionReplies"
            :key="getReplyKey(item, index)"
            :content="item.content"
            :reply-no="item.replyNo"
            :reply-time="item.replyTime"
          />
        </ul>
      </ElScrollbar>
    </div>
  </ElPopover>
</template>

<style lang="scss" scoped>
.mention-replies-popover-container {
  overflow: hidden;
  visibility: hidden;
  border-radius: var(--el-border-radius-base);

  &.mention-replies-popover-container-ready {
    visibility: visible;
  }
}

.mention-replies-popover-list {
  padding: 4px 12px 8px 28px;
  margin: 0;
}

.mention-replies-popover-header {
  padding: 10px 12px;
}

.mention-replies-popover-title {
  overflow: hidden;
  font-size: var(--el-font-size-base);
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
