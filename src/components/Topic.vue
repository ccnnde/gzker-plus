<script setup lang="ts">
import { computed, onBeforeMount, onUnmounted, provide, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import { debounce } from 'lodash-es';

import { useClickModal } from '@/composables/click-modal';
import { useDialog } from '@/composables/dialog';
import { useRequest } from '@/composables/request';
import { useTopicHostNavigation } from '@/composables/topic-host-navigation';
import { useTopicKeyboardScroll } from '@/composables/topic-keyboard-scroll';
import { useTopicReplies } from '@/composables/topic-replies';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import {
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
import { DialogType, LinkElementType, OptionsKey, topicLinkRegExp } from '@/constants';
import {
  ADD_REPLY_INJECTION_KEY,
  EDIT_REPLY_INJECTION_KEY,
  UPDATE_SCROLLBAR_INJECTION_KEY,
} from '@/constants/inject-key';
import { SUCCESS_CANCEL_FAVORITE_TOPIC, SUCCESS_FAVORITE_TOPIC, SUCCESS_LIKE } from '@/constants/res-msg';

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
import type { DialogBeforeCloseFn } from 'element-plus';
import type { TopicAction, UserReplyItem, UserTopic } from '@/types';

import 'viewerjs/dist/viewer.css';

const TOPIC_FOOTER_HEIGHT = 50;

const storage = useStorageStore();
const { options } = storeToRefs(storage);
const { closeOnClickModal } = useClickModal(DialogType.TopicViewer);
const { dialogVisible, openDialog, closeDialog } = useDialog();
const { isLoading, handleRequest, resetRequestState } = useRequest();
const isTopicPage = ref(false);
const topicContainer = ref<HTMLDivElement | null>(null);
const hotRepliesDialog = ref<InstanceType<typeof HotRepliesDialog> | null>(null);

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
  handleToggleReplyOrder,
  handleToggleOriginalPoster,
  refreshTopic,
  handleTopicSended,
  handleReplySended,
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

useTopicHostNavigation({
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
  handleRequest(async () => {
    if (!topicDetail.value) {
      return;
    }

    const { favorited, favoriteNumber } = topicDetail.value;

    if (favorited) {
      const data = await unfavoriteTopic(topicId.value);

      if (data === SUCCESS_CANCEL_FAVORITE_TOPIC) {
        topicDetail.value.favorited = false;
        topicDetail.value.favoriteNumber = String(Number(favoriteNumber) - 1);
      }
    } else {
      const data = await favoriteTopic(topicId.value);

      if (data === SUCCESS_FAVORITE_TOPIC) {
        topicDetail.value.favorited = true;
        topicDetail.value.favoriteNumber = String(Number(favoriteNumber) + 1);
      }
    }
  });
};

const handleTopicLike = () => {
  handleRequest(async () => {
    if (!topicDetail.value) {
      return;
    }

    const { likeNumber } = topicDetail.value;
    const data = await likeTopic(topicId.value);

    if (data === SUCCESS_LIKE) {
      topicDetail.value.liked = true;
      topicDetail.value.likeNumber = String(Number(likeNumber) + 1);
    }
  });
};

const handleTopicEdit = () => {
  handleRequest(async () => {
    const data = await getEditedTopic(topicId.value);
    topicEditor.value?.openDialog();
    topicEditor.value?.editTopic(topicId.value as string, data);
  });
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

const handleTopicDialogBeforeClose: DialogBeforeCloseFn = (done) => {
  if (isImgViewerVisible() || isGlobalLoadingVisible() || replyEditor.value?.isEmojiPickerVisible()) {
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

  showTopicFooter();
  resetRequestState();
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
  topicEditor.value?.openDialog();
  topicEditor.value?.addTopic(node);
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
  return [
    {
      label: t('enhancedTopic.exportTopic'),
      iconClass: 'i-mdi-tray-arrow-down',
      handler: handleExportTopic,
      loading: isExporting.value,
    },
    { label: t('enhancedTopic.hotReplies'), iconClass: 'i-mdi-heart-outline', handler: handleHotReplies },
    {
      label: t('enhancedTopic.refreshTopic'),
      iconClass: 'i-mdi-refresh',
      handler: handleRefreshTopic,
      loading: isTopicRefreshing.value,
    },
    { label: t('enhancedTopic.scrollToTop'), iconClass: 'i-mdi-arrow-up', handler: scrollToTop, showDivider: true },
    { label: t('enhancedTopic.scrollToBottom'), iconClass: 'i-mdi-arrow-down', handler: scrollToBottom },
  ];
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
  return isLoading.value || isReplyInitialLoading.value || isReplyFirstPageLoading.value;
});

const showTopicFooter = () => {
  topicFooterVisible.value = true;
};

const hideTopicFooter = () => {
  topicFooterVisible.value = false;
};

const addReply = (content?: string) => {
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
  replyEditor.value?.addReply(content);
};

provide(ADD_REPLY_INJECTION_KEY, addReply);

const editReply = (reply: UserReplyItem) => {
  hideTopicFooter();
  replyEditor.value?.openEditor();
  replyEditor.value?.editReply(reply);
};

provide(EDIT_REPLY_INJECTION_KEY, editReply);

onUnmounted(() => {
  exportAbortController?.abort();
});
</script>

<template>
  <ElementConfig>
    <ElDialog
      v-model="dialogVisible"
      :class="['topic-dialog', { 'topic-page-dialog': isTopicPage }]"
      :modal-class="isTopicPage ? 'topic-overlay' : 'gzk-dialog-overlay'"
      :z-index="isTopicPage ? 1000 : 2000"
      :show-close="false"
      :before-close="handleTopicDialogBeforeClose"
      :close-on-click-modal="!isTopicPage && closeOnClickModal"
      :close-on-press-escape="!isTopicPage"
      align-center
      @opened="handleTopicDialogOpened"
      @closed="handleTopicDialogClosed"
    >
      <template #header="{ close }">
        <div v-if="!isTopicPage" class="topic-dialog-absolute">
          <un-i-mdi-close class="topic-operate-icon" @click="close" />
        </div>
      </template>
      <div
        v-loading="isTopicBodyLoading"
        :style="topicBodyStyle"
        element-loading-background="transparent"
        element-loading-custom-class="gzk-loading-ring"
      >
        <ElScrollbar ref="scrollbar">
          <div
            ref="topicContainer"
            v-infinite-scroll="getNextReplyData"
            v-viewer="viewerOptions"
            class="topic-container"
            :style="topicContainerStyle"
            :infinite-scroll-disabled="disableReplyInfiniteScroll"
            :infinite-scroll-distance="100"
          >
            <TopicDetail v-if="topicDetail" v-bind="topicDetail" />
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
            <ElSkeleton v-if="isReplyNextPageLoading" animated />
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
            @closed="showTopicFooter"
            @toggle-fullscreen="isReplyEditorFullscreen = !isReplyEditorFullscreen"
          />
        </Transition>
        <TopicFooter
          v-show="topicDetail && topicFooterVisible"
          class="topic-body-absolute"
          :topic-id="topicId"
          :topic-title="topicDetail?.title"
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
          @toggle-reply-order="handleToggleReplyOrder"
          @toggle-original-poster="handleToggleOriginalPoster"
        />
      </div>
      <template #footer>
        <TopicActionRail :actions="topicActions" />
      </template>
    </ElDialog>
    <HotRepliesDialog ref="hotRepliesDialog" />
    <TopicEditor ref="topicEditor" @sended="handleTopicSended" />
  </ElementConfig>
</template>

<style lang="scss">
@import '@/styles/mixin';

.topic-overlay {
  top: var(--gzk-top-navbar-height);
  background-color: transparent;

  & > .el-overlay-dialog {
    top: var(--gzk-top-navbar-height);
  }

  &.dialog-fade-enter-active > .el-overlay-dialog {
    animation: none;
  }
}

.topic-dialog,
.hot-replies-dialog,
.mention-replies-popover {
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

.mention-replies-popover {
  .mention-reply-item-content {
    margin: 0;
  }
}

.gzk-app-img-viewer {
  background-color: rgb(0 0 0 / 30%);
}

.topic-dialog {
  .el-dialog__header {
    padding: 0;
    margin: 0;
  }

  .el-dialog__body {
    padding: 0;
  }

  .el-dialog__footer {
    padding: 0;
  }
}

.editor-dialog {
  display: flex;
  flex-direction: column;

  .el-dialog__body {
    flex: 1;
    padding-top: var(--gzk-topic-padding);
    padding-bottom: var(--gzk-topic-padding);
    overflow: hidden;
  }

  .el-dialog__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.editor-dialog-fullscreen,
.reply-editor-fullscreen {
  .cherry-toolbar {
    .ch-icon-dialog-fullscreen::before {
      content: '\EA42';
    }
  }
}

.editor-dialog-minscreen,
.reply-editor-minscreen {
  .cherry-toolbar {
    .ch-icon-dialog-fullscreen::before {
      content: '\EA41';
    }
  }
}

.topic-dialog,
.hot-replies-dialog,
.topic-editor-dialog,
.reply-editor-dialog,
.editor-help-dialog {
  border-radius: var(--el-border-radius-base);

  .el-dialog__header {
    padding-bottom: 0;
  }
}

.topic-dialog,
.topic-editor-dialog,
.editor-help-dialog {
  width: 45%;

  @include dynamic-width(55%, 60%, 65%, 70%, 75%, 80%, 85%, 90%);
}

.reply-editor-dialog,
.editor-history-dialog,
.hot-replies-dialog {
  width: 40%;

  @include dynamic-width(50%, 55%, 60%, 65%, 70%, 75%, 80%, 85%);
}

.editor-picker-popper {
  .el-select-dropdown__item {
    &:hover,
    &.hover {
      color: var(--el-color-primary);
    }
  }
}
</style>

<style lang="scss" scoped>
.topic-dialog-absolute {
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
  padding: var(--gzk-topic-padding);
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

.topic-body-absolute {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
}

.comment-icon {
  font-size: 18px;
  color: var(--el-text-color-secondary);
}
</style>
