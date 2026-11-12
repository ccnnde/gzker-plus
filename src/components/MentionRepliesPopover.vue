<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { ElScrollbar } from 'element-plus';
import { debounce } from 'lodash-es';

import { usePopoverTrigger } from '@/composables/popover-trigger';
import { useScrollbar } from '@/composables/scrollbar';
import { getReplyKey } from '@/utils';
import { viewerOptions, vViewer } from '@/utils/img-viewer';
import { getReplyMention } from '@/utils/reply-content';
import { REPLY_HOVER_INJECTION_KEY, UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import MentionReplyItem from './MentionReplyItem.vue';

import type Viewer from 'viewerjs';
import type { MentionRepliesResult, UserReplyItem } from '@/types';

interface Props {
  zIndex?: number;
}

withDefaults(defineProps<Props>(), {
  zIndex: 2001,
});

const SHOW_DELAY = 150;
const HIDE_DELAY = 200;
const REPLY_NUMBER_SELECTOR = '[data-reply-no]';
const REPLY_FLASH_CLASS = 'mention-reply-item-flash';
const replyHover = inject(REPLY_HOVER_INJECTION_KEY);

const visible = ref(false);
const positionReady = ref(false);
const referenceElement = ref<HTMLAnchorElement>();
const mentionName = computed(() => {
  const anchor = referenceElement.value;
  const name = (anchor?.textContent?.trim() || '').replace(/^@/, '');
  const mention = anchor && getReplyMention(anchor);

  if (mention && 'userId' in mention && mention.replyId) {
    return name.replace(/\s+#\d+$/, '');
  }

  return name;
});
const mentionRepliesContainer = ref<HTMLDivElement | null>(null);
const mentionReplies = ref<UserReplyItem[]>([]);
const focusReplyNo = ref<string>();
const { scrollbar } = useScrollbar();

let showTimer: number | undefined;
let hideTimer: number | undefined;
let positionFrame: number | undefined;
let pointerCheckFrame: number | undefined;
let pendingReferenceElement: HTMLAnchorElement | undefined;
let pointerClientX: number | undefined;
let pointerClientY: number | undefined;
let pointerInsidePopover = false;
let imageViewerActive = false;

const clearShowTimer = () => {
  window.clearTimeout(showTimer);
  showTimer = undefined;
  pendingReferenceElement = undefined;
};

const clearHideTimer = () => {
  window.clearTimeout(hideTimer);
  hideTimer = undefined;
};

const clearPositionFrame = () => {
  if (positionFrame !== undefined) {
    window.cancelAnimationFrame(positionFrame);
  }

  positionFrame = undefined;
};

const clearPointerCheckFrame = () => {
  if (pointerCheckFrame !== undefined) {
    window.cancelAnimationFrame(pointerCheckFrame);
  }

  pointerCheckFrame = undefined;
};

const updateScrollbar = debounce(() => {
  scrollbar.value?.update();
}, 500);

provide(UPDATE_SCROLLBAR_INJECTION_KEY, updateScrollbar);

const close = () => {
  clearShowTimer();
  clearHideTimer();
  clearPositionFrame();
  clearPointerCheckFrame();
  pointerInsidePopover = false;
  positionReady.value = false;
  visible.value = false;
};

const canOpen = usePopoverTrigger(close);

watch(
  () => replyHover?.disabled.value,
  (disabled) => {
    if (disabled) {
      close();
    }
  },
);

const cancelHide = () => {
  clearHideTimer();
};

const updatePointerPosition = (event: MouseEvent) => {
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

const schedulePointerCheck = () => {
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

const positionFocusedReply = () => {
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

const handleBeforeEnter = () => {
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

const flashFocusedReply = () => {
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

const handleAfterEnter = () => {
  flashFocusedReply();
};

const handleWindowScroll = (event: Event) => {
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

const handleWindowWheel = (event: WheelEvent) => {
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

const handleWindowResize = () => {
  if (imageViewerActive) {
    return;
  }

  close();
};

const hide = (targetElement?: HTMLAnchorElement) => {
  if (targetElement && pendingReferenceElement === targetElement) {
    clearShowTimer();
  }

  if (targetElement && referenceElement.value !== targetElement) {
    return;
  }

  if (!targetElement) {
    clearShowTimer();
  }

  clearHideTimer();

  if (!visible.value || imageViewerActive) {
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

const handlePopoverMouseEnter = (event: MouseEvent) => {
  updatePointerPosition(event);
  pointerInsidePopover = true;
  clearShowTimer();
  clearPointerCheckFrame();
  cancelHide();
};

const handlePopoverMouseLeave = (event: MouseEvent) => {
  updatePointerPosition(event);
  pointerInsidePopover = false;

  if (!imageViewerActive) {
    hide();
  }
};

const handlePopoverFocusIn = () => {
  clearShowTimer();
  cancelHide();
};

const handleViewerPointerMove = (event: PointerEvent) => {
  updatePointerPosition(event);
};

const handleImageViewerShow = () => {
  imageViewerActive = true;
  clearHideTimer();
  clearPointerCheckFrame();
  window.addEventListener('pointermove', handleViewerPointerMove, {
    passive: true,
  });
};

const handleImageViewerHidden = () => {
  window.removeEventListener('pointermove', handleViewerPointerMove);
  imageViewerActive = false;
  schedulePointerCheck();
};

const popoverViewerOptions: Viewer.Options = {
  ...viewerOptions,
  show: handleImageViewerShow,
  hidden: handleImageViewerHidden,
};

const show = (
  event: MouseEvent | FocusEvent,
  targetElement: HTMLAnchorElement,
  { replies: nextReplies, focusReplyNo: nextFocusReplyNo }: MentionRepliesResult,
) => {
  if (!canOpen(event)) {
    return;
  }

  clearShowTimer();

  if (!targetElement.isConnected) {
    if (referenceElement.value === targetElement) {
      close();
    }

    return;
  }

  if (visible.value && referenceElement.value === targetElement) {
    clearHideTimer();

    if (!nextReplies.length) {
      close();
      return;
    }

    mentionReplies.value = nextReplies;
    focusReplyNo.value = nextFocusReplyNo;
    return;
  }

  pendingReferenceElement = targetElement;

  const pendingShowTimer = window.setTimeout(async () => {
    if (showTimer !== pendingShowTimer || pendingReferenceElement !== targetElement || !targetElement.isConnected) {
      return;
    }

    showTimer = undefined;
    pendingReferenceElement = undefined;

    if (!nextReplies.length) {
      close();
      return;
    }

    const popoverAlreadyVisible = visible.value;

    clearHideTimer();
    referenceElement.value = targetElement;
    mentionReplies.value = nextReplies;
    focusReplyNo.value = nextFocusReplyNo;

    if (!popoverAlreadyVisible) {
      visible.value = true;
      return;
    }

    await nextTick();

    if (referenceElement.value !== targetElement || !targetElement.isConnected) {
      return;
    }

    positionFocusedReply();
    flashFocusedReply();
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
    popper-class="gzkp-mention-replies-popover"
    :popper-style="{ padding: 0 }"
    :z-index="zIndex"
    placement="top-start"
    virtual-triggering
    teleported
    @before-enter="handleBeforeEnter"
    @after-enter="handleAfterEnter"
  >
    <div
      ref="mentionRepliesContainer"
      v-viewer="popoverViewerOptions"
      :class="[
        'gzkp-mention-replies-popover-container',
        { 'gzkp-mention-replies-popover-container-ready': positionReady },
      ]"
      @mouseenter="handlePopoverMouseEnter"
      @mouseleave="handlePopoverMouseLeave"
      @focusin="handlePopoverFocusIn"
      @focusout="hide()"
    >
      <div class="gzkp-mention-replies-popover-header">
        <div class="gzkp-mention-replies-popover-title">
          <span class="gzkp-mention-replies-popover-name">{{ mentionName }}</span>
          <span class="gzkp-mention-replies-popover-label">
            {{ $t('enhancedTopic.mentionRepliesTitle') }}
          </span>
        </div>
      </div>
      <ElScrollbar ref="scrollbar" max-height="min(40vh, 360px)">
        <ul class="gzkp-mention-replies-popover-list">
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
.gzkp-mention-replies-popover-container {
  overflow: hidden;
  visibility: hidden;
  border-radius: var(--el-border-radius-base);

  &.gzkp-mention-replies-popover-container-ready {
    visibility: visible;
  }
}

.gzkp-mention-replies-popover-list {
  padding: 4px 0 8px;
  margin: 0;
  list-style: none;
}

.gzkp-mention-replies-popover-header {
  padding: 10px 12px;
}

.gzkp-mention-replies-popover-title {
  display: flex;
  gap: 5px;
  align-items: center;
  font-size: var(--el-font-size-base);
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.gzkp-mention-replies-popover-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.gzkp-mention-replies-popover-label {
  display: flex;
  flex: none;
  gap: 5px;
  align-items: center;

  &::before {
    width: 4px;
    height: 4px;
    content: '';
    background-color: currentcolor;
    border-radius: 50%;
  }
}
</style>
