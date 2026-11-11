<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onUnmounted, provide, ref } from 'vue';
import { until } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import { debounce } from 'lodash-es';

import { useClickModal } from '@/composables/click-modal';
import { useDialog } from '@/composables/dialog';
import { focusRenderedReply } from '@/composables/reply-focus';
import { useRequest } from '@/composables/request';
import { useTopicHostNavigation } from '@/composables/topic-host-navigation';
import { useTopicKeyboardScroll } from '@/composables/topic-keyboard-scroll';
import { useTopicReplies } from '@/composables/topic-replies';
import { useTopicShortcuts } from '@/composables/topic-shortcuts';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import {
  deleteTopic,
  favoriteTopic,
  getEditedTopic,
  getTopicExportSnapshot,
  likeTopic,
  parseUserTopic,
  unfavoriteTopic,
} from '@/api';
import {
  addUnit,
  blockTopics,
  blurActiveElement,
  calcTopicPageDialogVH,
  getStorage,
  hideGlobalLoading,
  isGlobalLoadingVisible,
  setStorage,
} from '@/utils';
import { isImgViewerVisible, viewerOptions, vViewer } from '@/utils/img-viewer';
import { downloadMarkdownFile, getTopicMarkdownFilename } from '@/utils/topic-export';
import { buildTopicMarkdown } from '@/utils/topic-markdown';
import { DialogType, INFINITE_SCROLL_LOAD_DISTANCE, LinkElementType, OptionsKey, topicLinkRegExp } from '@/constants';
import {
  ADD_REPLY_INJECTION_KEY,
  EDIT_REPLY_INJECTION_KEY,
  REPLY_FOCUS_ID_INJECTION_KEY,
  REPLY_HOVER_INJECTION_KEY,
  UPDATE_SCROLLBAR_INJECTION_KEY,
} from '@/constants/inject-key';
import { SELECTOR_ENHANCED_REPLY_ITEM, SELECTOR_REPLY_EDIT_BUTTON } from '@/constants/selector';

import ElementConfig from './ElementConfig.vue';
import HotRepliesDialog from './HotRepliesDialog.vue';
import LoadError from './LoadError.vue';
import ReplyEditor from './ReplyEditor.vue';
import TopicActionRail from './TopicActionRail.vue';
import TopicDetail from './TopicDetail.vue';
import TopicEditor from './TopicEditor.vue';
import TopicFooter from './TopicFooter.vue';
import TopicReply from './TopicReply.vue';
import TopicUserInfoPopover from './TopicUserInfoPopover.vue';

import type { CSSProperties } from 'vue';
import type { DialogBeforeCloseFn, ScrollbarDirection } from 'element-plus';
import type { TopicAction, UserReplyItem, UserTopic } from '@/types';

import 'viewerjs/dist/viewer.css';

const TOPIC_FOOTER_HEIGHT = 50;
const REPLY_HOVER_ENABLE_DELAY = 500;

const storage = useStorageStore();
const { options } = storeToRefs(storage);
const { closeOnClickModal } = useClickModal(DialogType.TopicViewer);
const { dialogVisible, openDialog, closeDialog } = useDialog();
const { isLoading, handleRequest, resetRequestState } = useRequest();
const {
  isLoading: isTopicActionLoading,
  handleRequest: handleTopicActionRequest,
  resetRequestState: resetTopicActionRequestState,
} = useRequest();
const isTopicPage = ref(false);
const topicContainer = ref<HTMLDivElement | null>(null);
const topicEditorContainer = ref<HTMLDivElement | null>(null);
const isTopicEditing = ref(false);
const isTopicEditorFullscreen = ref(false);
const isDeletingTopic = ref(false);
const hotRepliesDialog = ref<InstanceType<typeof HotRepliesDialog> | null>(null);
const replyHoverDisabled = ref(false);

let enableReplyHoverTimer: number | undefined;

const suppressReplyHover = () => {
  window.clearTimeout(enableReplyHoverTimer);
  replyHoverDisabled.value = true;

  enableReplyHoverTimer = window.setTimeout(() => {
    replyHoverDisabled.value = false;
    enableReplyHoverTimer = undefined;
  }, REPLY_HOVER_ENABLE_DELAY);
};

provide(REPLY_HOVER_INJECTION_KEY, {
  disabled: replyHoverDisabled,
  suppress: suppressReplyHover,
});

const {
  topicId,
  topicDetail,
  topicStatus,
  replyTotal,
  onlyOriginalPoster,
  isTopicRefreshing,
  isTopicPreloadLoading,
  isReplyInitialLoading,
  isReverseReply,
  showReply,
  nestedReplyDisplay,
  multipleInsideOne,
  isNestedReplyEnabled,
  effectiveReplyList,
  displayedReplyList,
  replyBatches,
  isReplyFirstPageLoading,
  isReplyNextPageLoading,
  replyLoadError,
  showNoOriginalPosterReply,
  showContinueSearchOriginalPosterReply,
  disableReplyInfiniteScroll,
  isReplyFirstPage,
  scrollbar,
  initReplyOrder,
  getParsedTopicPage,
  createTopicPageSeed,
  loadTopicReplies,
  openTopic,
  resetTopicData,
  scrollToReplyTotal,
  handleToggleReplyOrder,
  handleToggleOriginalPoster,
  refreshTopic,
  handleTopicSended,
  handleReplySended,
  handleReplyModified,
  getNextReplyData,
  reloadReplyData,
  scrollToTop,
  scrollToBottom,
  scrollBy,
} = useTopicReplies({
  dialogVisible,
  options,
  topicContainer,
});

const replyFocusId = ref<string>();

provide(REPLY_FOCUS_ID_INJECTION_KEY, replyFocusId);

const focusTopicReply = async (replyId: string) => {
  const currentTopicId = topicId.value;

  if (!currentTopicId || replyFocusId.value) {
    return;
  }

  replyFocusId.value = replyId;

  try {
    if (onlyOriginalPoster.value && !displayedReplyList.value.some((reply) => reply.replyId === replyId)) {
      await handleToggleOriginalPoster();
    }

    await until(() => {
      return isTopicPreloadLoading.value || isReplyFirstPageLoading.value || isReplyNextPageLoading.value;
    }).toBe(false, { timeout: 10_000 });

    while (dialogVisible.value && topicId.value === currentTopicId) {
      await nextTick();

      if (!dialogVisible.value || topicId.value !== currentTopicId) {
        return;
      }

      if (topicContainer.value && focusRenderedReply(topicContainer.value, replyId)) {
        const hash = `#r${replyId}`;

        if (isTopicPage.value && window.location.hash !== hash) {
          window.history.pushState(window.history.state, '', hash);
        }

        return;
      }

      const loadedCount = effectiveReplyList.value.length;
      await getNextReplyData();

      if (effectiveReplyList.value.length <= loadedCount) {
        break;
      }
    }

    if (dialogVisible.value && topicId.value === currentTopicId) {
      ElMessage.warning(t('enhancedTopic.bounty.replyUnavailable'));
    }
  } finally {
    replyFocusId.value = undefined;
  }
};

const handleReplyScrollEnd = (direction: ScrollbarDirection) => {
  if (direction !== 'bottom' || disableReplyInfiniteScroll.value) {
    return;
  }

  getNextReplyData();
};

const isTopicLinkBlank = computed(() => {
  if (!options.value) {
    return false;
  }

  const { checkedLinkTypes } = options.value[OptionsKey.BlankLink];
  return checkedLinkTypes.includes(LinkElementType.Topic);
});

onBeforeMount(() => {
  const { pathname, search } = window.location;

  if (!topicLinkRegExp.test(pathname)) {
    return;
  }

  topicId.value = pathname.match(topicLinkRegExp)?.[1];
  isTopicPage.value = true;
  onlyOriginalPoster.value = false;
  initReplyOrder();

  let parsedTopic: UserTopic;

  try {
    parsedTopic = parseUserTopic(document.body.innerHTML);

    if (!parsedTopic.detail.title) {
      throw new Error('Topic does not exist');
    }
  } catch (err) {
    console.error(err);
    hideGlobalLoading();
    ElMessage.error(t('enhancedTopic.parseTopicFailed'));
    return;
  }

  const {
    detail,
    status,
    reply: { total, list },
  } = parsedTopic;
  const parsedTopicPage = getParsedTopicPage(search, total, list);

  topicDetail.value = detail;
  topicStatus.value = status;
  replyTotal.value = total;

  openDialog();

  /**
   * 新标签页查看主题时，将当前 DOM 对应页作为隐藏缓存：
   * 加载器仍从正序首页或倒序末页开始展示，仅请求尚未缓存的页面。
   */
  const parsedTopicPageSeed = createTopicPageSeed(parsedTopicPage, parsedTopic);
  loadTopicReplies({
    pageSeeds: parsedTopicPageSeed ? [parsedTopicPageSeed] : [],
  });

  hideGlobalLoading();
});

const { openCreateTopicForCurrentNode } = useTopicHostNavigation({
  isTopicPage,
  openTopicInBlank: isTopicLinkBlank,
  onTopicSelected: (selectedTopicId) => {
    openDialog();
    openTopic(selectedTopicId);
  },
  onCreateTopic: (node) => {
    addTopic(node);
  },
});

const handleTopicFavorite = () => {
  if (isTopicActionLoading.value) {
    return;
  }

  handleTopicActionRequest(async () => {
    if (!topicDetail.value) {
      return;
    }

    const data = topicDetail.value.favorited
      ? await unfavoriteTopic(topicId.value)
      : await favoriteTopic(topicId.value);

    topicDetail.value.favorited = data.favorited;
    topicDetail.value.favoriteNumber = String(data.count);
  });
};

const handleTopicLike = () => {
  if (isTopicActionLoading.value) {
    return;
  }

  handleTopicActionRequest(async () => {
    if (!topicDetail.value) {
      return;
    }

    const data = await likeTopic(topicId.value, !topicDetail.value.liked);

    topicDetail.value.liked = data.voted;
    topicDetail.value.likeNumber = String(data.count);
  });
};

const handleTopicEdit = () => {
  if (!topicDetail.value?.editable || isTopicActionLoading.value) {
    return;
  }

  handleTopicActionRequest(async () => {
    const data = await getEditedTopic(topicId.value);
    topicEditor.value?.openEditEditor(topicId.value as string, data);
  });
};

const handleTopicDelete = async () => {
  if (!topicId.value || !topicDetail.value?.deletable || isDeletingTopic.value) {
    return;
  }

  const deletedTopicId = topicId.value;
  isDeletingTopic.value = true;

  try {
    await ElMessageBox.confirm(t('enhancedTopic.confirmDeleteTopic'), t('common.warning'), {
      type: 'warning',
      autofocus: false,
    });
  } catch {
    isDeletingTopic.value = false;
    return;
  }

  await handleTopicActionRequest(async () => {
    await deleteTopic(deletedTopicId);

    if (topicId.value === deletedTopicId && topicDetail.value) {
      topicDetail.value.deletable = false;
    }

    ElMessage.success({
      message: t('enhancedTopic.deleteTopicSuccessful'),
      onClose: () => window.location.reload(),
    });
  });

  isDeletingTopic.value = false;
};

const handleTopicBlock = async () => {
  try {
    if (!topicId.value || !topicDetail.value?.title) {
      return;
    }

    const id = topicId.value;
    const { title } = topicDetail.value;
    const { blockedTopicList } = await getStorage();
    const blockedTopic = blockedTopicList.find((item) => item.id === id);

    if (blockedTopic) {
      ElMessage.error(t('enhancedTopic.alreadyBlockTopic'));
      return;
    }

    await ElMessageBox.confirm(t('enhancedTopic.confirmBlockTopic', { title }), t('common.warning'), {
      type: 'warning',
      autofocus: false,
    });

    handleRequest(async () => {
      blockedTopicList.push({
        id,
        title,
      });

      await setStorage({
        blockedTopicList,
      });

      if (!isTopicPage.value) {
        blockTopics([id]);
        closeDialog();
      }

      ElMessage.success(t('enhancedTopic.blockTopicSuccessful'));
    });
  } catch {
    ElMessage(t('common.canceled'));
  }
};

const handleTopicDialogOpened = () => {
  blurActiveElement();
  startKeyboardScroll();
  replyEditor.value?.generateCreateHistoryId();
};

const isTopicDialogCloseBlocked = () => {
  return (
    isImgViewerVisible() ||
    isGlobalLoadingVisible() ||
    replyEditor.value?.isEmojiPickerVisible() ||
    topicEditor.value?.isEmojiPickerVisible()
  );
};

const handleTopicDialogEscape = (event: KeyboardEvent) => {
  if (isTopicEditing.value || topicFooterVisible.value || event.defaultPrevented || event.isComposing) {
    return;
  }

  if (isTopicDialogCloseBlocked()) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  if (event.repeat || replyEditor.value?.dismissSelectPicker()) {
    return;
  }

  replyEditor.value?.closeEditor();
};

const handleTopicDialogBeforeClose: DialogBeforeCloseFn = (done) => {
  if (isTopicDialogCloseBlocked()) {
    return;
  }

  if (isTopicEditing.value) {
    topicEditor.value?.closeEditor();
    return;
  }

  done();
};

const handleTopicDialogClosed = () => {
  stopKeyboardScroll();
  resetTopicData();

  isReplyEditorFullscreen.value = false;
  replyEditor.value?.resetEditHistoryId();
  replyEditor.value?.closeEditor();
  replyEditor.value?.clearContent();
  replyEditor.value?.resetEditorLayout();
  topicEditor.value?.closeEditor();

  showTopicFooter();
  resetRequestState();
  resetTopicActionRequestState();
};

const { startKeyboardScroll, stopKeyboardScroll } = useTopicKeyboardScroll({
  scrollbar,
  scrollToTop,
  scrollToBottom,
  scrollBy,
});

const updateScrollbar = debounce(() => {
  scrollbar.value?.update();
}, 500);

provide(UPDATE_SCROLLBAR_INJECTION_KEY, updateScrollbar);

const topicEditor = ref<InstanceType<typeof TopicEditor> | null>(null);

const addTopic = (node: string) => {
  const shouldRefreshAfterCreate = !dialogVisible.value;
  topicEditor.value?.openCreateEditor(node, shouldRefreshAfterCreate);
};

const replyEditor = ref<InstanceType<typeof ReplyEditor> | null>(null);
const isReplyEditorFullscreen = ref(false);
const topicFooterVisible = ref(true);
const isExporting = ref(false);
let exportAbortController: AbortController | undefined;

const handleExportTopic = async () => {
  if (isExporting.value || !topicId.value) {
    return;
  }

  const exportedTopicId = topicId.value;
  const abortController = new AbortController();
  exportAbortController = abortController;
  isExporting.value = true;

  try {
    const topicSnapshot = await getTopicExportSnapshot(exportedTopicId, abortController.signal);
    const filename = getTopicMarkdownFilename(topicSnapshot.detail.title);

    if (!filename) {
      throw new Error(t('enhancedTopic.exportTopicInvalidTitle'));
    }

    if (abortController.signal.aborted) {
      return;
    }

    const markdown = buildTopicMarkdown({
      topic: topicSnapshot,
      topicId: exportedTopicId,
    });
    downloadMarkdownFile(markdown, filename);
    ElMessage.success(t('enhancedTopic.exportTopicSuccessful'));
  } catch (err) {
    if (!abortController.signal.aborted) {
      const errorMessage = err instanceof Error && err.message ? err.message : t('enhancedTopic.exportTopicFailed');
      ElMessage.error(errorMessage);
      console.error(err);
    }
  } finally {
    if (exportAbortController === abortController) {
      exportAbortController = undefined;
      isExporting.value = false;
    }
  }
};

const handleHotReplies = () => {
  hotRepliesDialog.value?.openDialog([...effectiveReplyList.value]);
};

const handleRefreshTopic = () => {
  refreshTopic();
};

// @unocss-include
const topicActions = computed<readonly TopicAction[]>(() => {
  const actions: TopicAction[] = [];

  if (topicId.value && topicDetail.value?.deletable) {
    actions.push({
      label: t('enhancedTopic.deleteTopic'),
      iconClass: 'i-mdi-trash-can-outline',
      handler: handleTopicDelete,
      loading: isDeletingTopic.value,
    });
  }

  if (topicId.value) {
    actions.push({
      type: 'share',
      label: t('enhancedTopic.shareTopic'),
      iconClass: 'i-mdi-share-variant-outline',
    });
  }

  actions.push(
    {
      label: t('enhancedTopic.exportTopic'),
      iconClass: 'i-mdi-tray-arrow-down',
      handler: handleExportTopic,
      loading: isExporting.value,
    },
    {
      label: t('enhancedTopic.hotReplies'),
      iconClass: 'i-mdi-heart-outline',
      handler: handleHotReplies,
    },
    {
      label: t('enhancedTopic.refreshTopic'),
      iconClass: 'i-mdi-refresh',
      handler: handleRefreshTopic,
      loading: isTopicRefreshing.value,
    },
    {
      label: t('enhancedTopic.scrollToTop'),
      iconClass: 'i-mdi-arrow-up',
      handler: scrollToTop,
      showDivider: true,
    },
    {
      label: t('enhancedTopic.scrollToBottom'),
      iconClass: 'i-mdi-arrow-down',
      handler: scrollToBottom,
    },
  );

  return actions;
});

const replyEditorHeight = computed(() => {
  return isReplyEditorFullscreen.value ? 400 : 315;
});

const currentFooterHeight = computed(() => {
  return topicFooterVisible.value ? TOPIC_FOOTER_HEIGHT : replyEditorHeight.value;
});

const topicDialogVH = computed(() => {
  return isTopicPage.value ? calcTopicPageDialogVH() : 92;
});

const topicDialogStyle = computed<CSSProperties | undefined>(() => {
  if (!isTopicEditing.value) {
    return;
  }

  if (isTopicEditorFullscreen.value) {
    return {
      width: '95%',
      height: '95%',
    };
  }

  return {
    height: `${topicDialogVH.value}vh`,
  };
});

const topicContainerStyle = computed<CSSProperties>(() => {
  return {
    height: `calc(${topicDialogVH.value}vh - ${addUnit(currentFooterHeight.value)})`,
  };
});

const topicBodyStyle = computed<CSSProperties>(() => {
  return {
    paddingBottom: addUnit(currentFooterHeight.value),
  };
});

const isTopicBodyLoading = computed(() => {
  return isLoading.value || isTopicActionLoading.value || isReplyInitialLoading.value || isReplyFirstPageLoading.value;
});

const showTopicFooter = () => {
  topicFooterVisible.value = true;
};

const hideTopicFooter = () => {
  topicFooterVisible.value = false;
};

const handleTopicEditModeChange = (editing: boolean) => {
  isTopicEditing.value = editing;

  if (editing) {
    stopKeyboardScroll();
    return;
  }

  isTopicEditorFullscreen.value = false;

  if (dialogVisible.value) {
    startKeyboardScroll();
  }
};

const handleTopicEditFullscreenChange = (fullscreen: boolean) => {
  isTopicEditorFullscreen.value = fullscreen;
};

const addReply = (reply?: UserReplyItem) => {
  if (import.meta.env.PROD) {
    if (topicStatus.value?.unbindedPhone) {
      ElMessage.error(t('enhancedTopic.cannotReplyByInvalidUser'));
      return;
    }

    if (topicStatus.value?.locked) {
      ElMessage.error(t('enhancedTopic.cannotReplyByLockedPost'));
      return;
    }
  }

  hideTopicFooter();
  replyEditor.value?.openEditor();
  replyEditor.value?.addReply(reply);
};

provide(ADD_REPLY_INJECTION_KEY, addReply);

const editReply = (reply: UserReplyItem) => {
  hideTopicFooter();
  replyEditor.value?.openEditor();
  replyEditor.value?.editReply(reply);
};

provide(EDIT_REPLY_INJECTION_KEY, editReply);

const isVisibleReplyEditButton = (button: HTMLElement) => {
  return button.getClientRects().length > 0 && getComputedStyle(button).visibility === 'visible';
};

const handleReplyEditShortcut = () => {
  const container = topicContainer.value;

  if (!container) {
    return;
  }

  const hoveredReply = [...container.querySelectorAll(`${SELECTOR_ENHANCED_REPLY_ITEM}:hover`)].at(-1);

  if (hoveredReply) {
    const button = [...hoveredReply.querySelectorAll<HTMLElement>(SELECTOR_REPLY_EDIT_BUTTON)].find((item) => {
      return item.closest(SELECTOR_ENHANCED_REPLY_ITEM) === hoveredReply && isVisibleReplyEditButton(item);
    });

    if (button) {
      button.click();
    } else {
      ElMessage.warning(t('enhancedTopic.cannotEditSelectedReply'));
    }

    return;
  }

  const loginUserId = storage.settings?.loginUserId;
  const ownReplies = effectiveReplyList.value.filter((reply) => {
    return loginUserId && reply.uid === loginUserId && reply.editable;
  });
  const ownReplyIds = new Set(
    ownReplies.map((reply) => {
      return reply.replyId;
    }),
  );
  const editButtons = [...container.querySelectorAll<HTMLElement>(SELECTOR_REPLY_EDIT_BUTTON)];
  const button = editButtons.reverse().find((item) => {
    const replyId = item.closest<HTMLElement>(SELECTOR_ENHANCED_REPLY_ITEM)?.dataset.gzkpReplyId;

    return replyId && ownReplyIds.has(replyId) && isVisibleReplyEditButton(item);
  });

  if (button) {
    button.click();
  } else {
    ElMessage.warning(t('enhancedTopic.noOwnEditableReply'));
  }
};

useTopicShortcuts({
  container: topicContainer,
  isActive: () => {
    return (
      dialogVisible.value &&
      Boolean(topicDetail.value) &&
      !isTopicEditing.value &&
      !isImgViewerVisible() &&
      !isGlobalLoadingVisible()
    );
  },
  favorite: handleTopicFavorite,
  like: handleTopicLike,
  reply: () => {
    if (topicFooterVisible.value) {
      addReply();
    } else {
      replyEditor.value?.openEditor();
    }
  },
  scrollToTop,
  editTopic: handleTopicEdit,
  editReply: handleReplyEditShortcut,
  createTopic: () => {
    if (!isImgViewerVisible() && !isGlobalLoadingVisible()) {
      openCreateTopicForCurrentNode();
    }
  },
});

onUnmounted(() => {
  window.clearTimeout(enableReplyHoverTimer);
  exportAbortController?.abort();
});
</script>

<template>
  <ElementConfig>
    <ElDialog
      v-model="dialogVisible"
      :class="[
        'gzkp-topic-dialog',
        { 'gzkp-topic-page-dialog': isTopicPage, 'gzkp-topic-dialog-editing': isTopicEditing },
      ]"
      :style="topicDialogStyle"
      :modal-class="isTopicPage ? 'gzkp-topic-overlay' : ''"
      :z-index="isTopicPage ? 1000 : 2000"
      :show-close="false"
      :before-close="handleTopicDialogBeforeClose"
      :close-on-click-modal="!isTopicPage && closeOnClickModal"
      :close-on-press-escape="isTopicEditing || (!isTopicPage && topicFooterVisible)"
      :transition="{ name: 'gzkp-topic-dialog', css: false }"
      align-center
      @keydown.esc.capture="handleTopicDialogEscape"
      @opened="handleTopicDialogOpened"
      @closed="handleTopicDialogClosed"
    >
      <template #header="{ close }">
        <div v-if="!isTopicPage && !isTopicEditing" class="gzkp-topic-dialog-absolute">
          <un-i-mdi-close class="topic-operate-icon" @click="close" />
        </div>
      </template>
      <div
        v-show="!isTopicEditing"
        v-loading="isTopicBodyLoading"
        :style="topicBodyStyle"
        :element-loading-background="isTopicActionLoading ? 'transparent' : undefined"
        element-loading-custom-class="gzkp-loading-ring gzkp-loading-instant-enter"
      >
        <ElScrollbar ref="scrollbar" :distance="INFINITE_SCROLL_LOAD_DISTANCE" @end-reached="handleReplyScrollEnd">
          <div ref="topicContainer" v-viewer="viewerOptions" class="topic-container" :style="topicContainerStyle">
            <TopicDetail v-if="topicDetail" v-bind="topicDetail" :topic-id="topicId" @focus-reply="focusTopicReply" />
            <ElDivider v-if="topicDetail" border-style="dashed">
              <un-i-mdi-comment-processing-outline class="comment-icon" />
            </ElDivider>
            <TopicReply
              v-if="showReply && (!isNestedReplyEnabled || replyBatches.length)"
              :total="replyTotal"
              :list="displayedReplyList"
              :batches="replyBatches"
              :nested-reply-display="nestedReplyDisplay"
              :multiple-inside-one="multipleInsideOne"
              :reverse="isReverseReply"
              :source-list="effectiveReplyList"
              :force-flat="onlyOriginalPoster"
            />
            <ElEmpty v-if="showContinueSearchOriginalPosterReply && displayedReplyList.length === 0">
              <template #description>
                <button type="button" class="topic-reply-action-prompt" @click="getNextReplyData">
                  {{ $t('enhancedTopic.continueSearchOriginalPosterReplyEmpty') }}
                </button>
              </template>
            </ElEmpty>
            <button
              v-if="showContinueSearchOriginalPosterReply && displayedReplyList.length > 0"
              type="button"
              class="topic-reply-action-prompt"
              @click="getNextReplyData"
            >
              {{ $t('enhancedTopic.continueSearchOriginalPosterReply') }}
            </button>
            <ElSkeleton v-if="isReplyNextPageLoading" class="topic-reply-loading" aria-hidden="true" animated>
              <template #template>
                <div class="topic-reply-loading-content">
                  <ElSkeletonItem class="topic-reply-loading-line" variant="text" />
                  <ElSkeletonItem class="topic-reply-loading-line" variant="text" />
                  <ElSkeletonItem class="topic-reply-loading-line topic-reply-loading-line-short" variant="text" />
                </div>
              </template>
            </ElSkeleton>
            <ElEmpty
              v-if="
                topicDetail &&
                replyTotal === '0' &&
                !isTopicPreloadLoading &&
                !isReplyFirstPageLoading &&
                !isReplyNextPageLoading &&
                !replyLoadError
              "
              :description="$t('enhancedTopic.noReply')"
            />
            <ElEmpty v-if="showNoOriginalPosterReply" :description="$t('enhancedTopic.noOriginalPosterReply')" />
            <LoadError
              v-show="replyLoadError"
              :show-icon="isReplyFirstPage"
              :error-text="$t('common.loadFailedAndRetry')"
              @retry="reloadReplyData"
            />
          </div>
        </ElScrollbar>
        <TopicUserInfoPopover v-if="dialogVisible" :container="topicContainer" />
        <Transition name="el-fade-in-linear" leave-active-class="">
          <ReplyEditor
            ref="replyEditor"
            class="topic-body-absolute"
            :topic-id="topicId"
            :reply-list="effectiveReplyList"
            :height="replyEditorHeight"
            :fullscreen="isReplyEditorFullscreen"
            @sended="handleReplySended"
            @modified="handleReplyModified"
            @closed="showTopicFooter"
            @toggle-fullscreen="isReplyEditorFullscreen = !isReplyEditorFullscreen"
          />
        </Transition>
        <TopicFooter
          v-show="topicDetail && topicFooterVisible"
          class="topic-body-absolute"
          :reply-total="replyTotal"
          :favorited="topicDetail?.favorited"
          :favorite-number="topicDetail?.favoriteNumber"
          :liked="topicDetail?.liked"
          :like-number="topicDetail?.likeNumber"
          :editable="topicDetail?.editable"
          :height="TOPIC_FOOTER_HEIGHT"
          :reverse-reply="isReverseReply"
          :only-original-poster="onlyOriginalPoster"
          :loading="isTopicBodyLoading"
          @favorite-topic="handleTopicFavorite"
          @like-topic="handleTopicLike"
          @edit-topic="handleTopicEdit"
          @block-topic="handleTopicBlock"
          @scroll-to-reply-total="scrollToReplyTotal"
          @toggle-reply-order="handleToggleReplyOrder"
          @toggle-original-poster="handleToggleOriginalPoster"
        />
      </div>
      <div v-if="isTopicEditing" ref="topicEditorContainer" class="topic-editor-host"></div>
      <template v-if="!isTopicEditing" #footer>
        <TopicActionRail :actions="topicActions" :topic-id="topicId" :topic-title="topicDetail?.title" />
      </template>
    </ElDialog>
    <HotRepliesDialog ref="hotRepliesDialog" />
    <TopicEditor
      ref="topicEditor"
      :inline-target="topicEditorContainer"
      @sended="handleTopicSended"
      @edit-mode-change="handleTopicEditModeChange"
      @edit-fullscreen-change="handleTopicEditFullscreenChange"
    />
  </ElementConfig>
</template>

<style lang="scss">
@import '@/styles/mixin';

.gzkp-topic-overlay {
  top: var(--gzkp-top-navbar-height);
  background-color: transparent;

  & > .el-overlay-dialog {
    top: var(--gzkp-top-navbar-height);
  }
}

.gzkp-topic-dialog,
.gzkp-hot-replies-dialog,
.gzkp-mention-replies-popover {
  img {
    max-width: 100%;
  }

  .user-id {
    font-weight: var(--el-font-weight-primary);
    color: var(--el-text-color-regular);

    a {
      color: var(--el-text-color-regular);
    }
  }

  .user-meta {
    color: var(--el-text-color-regular);

    span + span::before {
      color: var(--el-text-color-primary);
      content: ' • ';
    }
  }

  .main-content {
    margin: 15px 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
    word-break: break-all;
    overflow-wrap: anywhere;

    img:not([src^='/static/emoji'], [src^='https://face.t.sinajs.cn'], [src^='https://img.whzxc.cn/bd'])
    {
      margin-bottom: 16px;
    }

    p > img:last-child,
    p > :last-child img:last-child {
      margin-bottom: 0;
    }

    &.markdown-body {
      blockquote {
        font-size: inherit;
      }

      pre > code {
        white-space: pre-wrap;
      }
    }
  }

  .number-info {
    color: var(--el-text-color-secondary);
  }
}

.gzkp-mention-replies-popover {
  .mention-reply-item-content {
    margin: 0;
  }
}

.gzkp-app-img-viewer {
  background-color: var(--gzkp-img-viewer-bg-color);

  .viewer-footer {
    bottom: 12px;
    overflow: visible;
  }

  .viewer-title {
    min-height: auto;
    margin: 0 5% 6px;
    font-size: 13px;
    color: rgb(255 255 255 / 66%);
    opacity: 1;

    &:hover {
      opacity: 1;
    }
  }

  .viewer-toolbar > ul {
    display: inline-flex;
    gap: 1px;
    align-items: center;
    padding: 3px 7px;
    margin: 0 auto;
    background-color: var(--gzkp-img-viewer-ctrl-bg-color);
    border-radius: 999px;
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 10%), 0 12px 30px rgb(0 0 0 / 42%);

    & > li {
      position: relative;
      width: 34px;
      height: 34px;
      margin: 0;
      overflow: visible;
      background-color: transparent;
      opacity: 1;
      transition: none;

      &:focus {
        background-color: transparent;
        outline: none;
        box-shadow: none;
        opacity: 1;
      }

      &:hover {
        background-color: transparent;
        opacity: 0.72;
      }

      &::before {
        margin: 7px;
      }

      &.viewer-download::before {
        display: block;
        width: 20px;
        height: 20px;
        content: '';
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M10 3v9m-4-3 4 4 4-4M4 16h12' fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: 20px;
      }

      &.viewer-download-success::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='m4 10 4 4 8-9' fill='none' stroke='%2367c23a' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.4'/%3E%3C/svg%3E");
      }

      /* stylelint-disable-next-line no-descending-specificity */
      & + li {
        margin-left: 1px;
      }

      &:nth-child(5),
      &:nth-child(8) {
        margin-left: 8px;

        &::after {
          position: absolute;
          top: 7px;
          left: -5px;
          width: 1px;
          height: 20px;
          content: '';
          background-color: rgb(255 255 255 / 13%);
        }
      }

      &.viewer-small,
      &.viewer-large {
        width: 34px;
        height: 34px;
        margin: 0;

        &::before {
          margin: 7px;
        }
      }
    }
  }

  .viewer-navigation {
    & > .viewer-prev,
    & > .viewer-next {
      width: 40px;
      height: 40px;
      margin-top: -20px;
      background-color: var(--gzkp-img-viewer-ctrl-bg-color);
      box-shadow: 0 12px 30px rgb(0 0 0 / 42%);
      transition: none;

      &:focus {
        background-color: var(--gzkp-img-viewer-ctrl-bg-color);
        outline: none;
        box-shadow: 0 12px 30px rgb(0 0 0 / 42%);
      }

      &:hover {
        background-color: var(--gzkp-img-viewer-ctrl-hover-bg-color);
      }

      &::before {
        margin: 10px;
      }
    }

    /* stylelint-disable-next-line no-descending-specificity */
    & > .viewer-prev {
      left: 24px;
    }

    /* stylelint-disable-next-line no-descending-specificity */
    & > .viewer-next {
      right: 24px;
    }
  }

  .viewer-button {
    top: 20px;
    right: 24px;
    width: 40px;
    height: 40px;
    background-color: var(--gzkp-img-viewer-ctrl-bg-color);
    box-shadow: 0 12px 30px rgb(0 0 0 / 42%);
    transition: none;

    &:focus {
      background-color: var(--gzkp-img-viewer-ctrl-bg-color);
      outline: none;
      box-shadow: 0 12px 30px rgb(0 0 0 / 42%);
    }

    &:hover {
      background-color: var(--gzkp-img-viewer-ctrl-hover-bg-color);
    }

    &::before {
      top: 10px;
      bottom: auto;
      left: 10px;
    }
  }
}

.gzkp-topic-dialog {
  padding: 0;

  .el-dialog__header {
    padding: 0;
    margin: 0;
  }

  .el-dialog__body {
    position: relative;
    padding: 0;
  }

  .el-dialog__footer {
    padding: 0;
  }
}

.gzkp-topic-dialog-editing {
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .el-dialog__body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}

.gzkp-editor-dialog {
  display: flex;
  flex-direction: column;

  .el-dialog__body {
    flex: 1;
    padding-top: var(--gzkp-topic-padding);
    padding-bottom: var(--gzkp-topic-padding);
    overflow: hidden;
  }

  .el-dialog__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.gzkp-editor-dialog-fullscreen,
.gzkp-reply-editor-fullscreen {
  .cherry-toolbar {
    .ch-icon-dialog-fullscreen::before {
      content: '\EA42';
    }
  }
}

.gzkp-editor-dialog-minscreen,
.gzkp-reply-editor-minscreen {
  .cherry-toolbar {
    .ch-icon-dialog-fullscreen::before {
      content: '\EA41';
    }
  }
}

.gzkp-topic-dialog,
.gzkp-hot-replies-dialog,
.gzkp-topic-editor-dialog,
.gzkp-reply-editor-dialog,
.gzkp-editor-help-dialog {
  border-radius: var(--el-border-radius-base);

  .el-dialog__header {
    padding-bottom: 0;
  }
}

.gzkp-topic-dialog,
.gzkp-topic-editor-dialog {
  width: 45%;

  @include dynamic-width(55%, 60%, 65%, 70%, 75%, 80%, 85%, 90%);
}

.gzkp-reply-editor-dialog,
.gzkp-editor-help-dialog,
.gzkp-editor-history-dialog,
.gzkp-hot-replies-dialog {
  width: 40%;

  @include dynamic-width(50%, 55%, 60%, 65%, 70%, 75%, 80%, 85%);
}

.gzkp-editor-picker-popper {
  .el-select-dropdown__item {
    &:hover,
    &.hover {
      color: var(--el-color-primary);
    }
  }
}
</style>

<style lang="scss" scoped>
.gzkp-topic-dialog-absolute {
  position: absolute;
  right: -10px;
}

.topic-operate-icon {
  position: absolute;
  padding: 10px;
  font-size: 32px;
  color: rgb(255 255 255 / 70%);
  cursor: pointer;
}

.topic-container {
  width: 100%;
  padding: var(--gzkp-topic-padding);
}

.topic-reply-action-prompt {
  display: block;
  align-self: stretch;
  width: 100%;
  padding: 10px 0;
  font: inherit;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  text-align: center;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.topic-reply-loading {
  box-sizing: border-box;
  padding: 0 10px 20px;
  overflow: hidden;
  overflow-anchor: none;
}

.topic-reply-loading-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.topic-reply-loading-line {
  height: 12px;
}

.topic-reply-loading-line-short {
  width: 23%;
}

@media (prefers-reduced-motion: reduce) {
  .topic-reply-loading.is-animated :deep(.el-skeleton__item) {
    animation: none;
  }
}

.topic-body-absolute {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
}

.topic-editor-host {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: var(--el-bg-color);
}

.comment-icon {
  font-size: 18px;
  color: var(--el-text-color-secondary);
}
</style>
