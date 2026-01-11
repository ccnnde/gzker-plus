<script setup lang="ts">
import { computed, onBeforeMount, onMounted, provide, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import { debounce } from 'lodash-es';

import FadeTransition from '@/transitions/FadeTransition.vue';
import { useClickModal } from '@/composables/click-modal';
import { useDialog } from '@/composables/dialog';
import { useRequest } from '@/composables/request';
import { useScrollLoad } from '@/composables/scroll-load';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { favoriteTopic, getEditedTopic, getUserTopic, likeTopic, parseUserTopic, unfavoriteTopic } from '@/api';
import {
  addUnit,
  blockTopics,
  calcTopicPageDialogVH,
  getStorage,
  hideGlobalLoading,
  isGlobalLoadingVisible,
  request,
  setStorage,
  waitTime,
} from '@/utils';
import { emitter } from '@/utils/event-bus';
import { isImgViewerVisible, viewerOptions, vViewer } from '@/utils/img-viewer';
import { DialogType, LinkElementType, OptionsKey, topicLinkRegExp } from '@/constants';
import {
  ADD_REPLY_INJECTION_KEY,
  EDIT_REPLY_INJECTION_KEY,
  UPDATE_SCROLLBAR_INJECTION_KEY,
} from '@/constants/inject-key';
import { SUCCESS_CANCEL_FAVORITE_TOPIC, SUCCESS_FAVORITE_TOPIC, SUCCESS_LIKE } from '@/constants/res-msg';
import { SELECTOR_TOPIC_LINK } from '@/constants/selector';

import ElementConfig from './ElementConfig.vue';
import LoadError from './LoadError.vue';
import ReplyEditor from './ReplyEditor.vue';
import TopicDetail from './TopicDetail.vue';
import TopicEditor from './TopicEditor.vue';
import TopicFooter from './TopicFooter.vue';
import TopicReply from './TopicReply.vue';

import type { CSSProperties } from 'vue';
import type { DialogBeforeCloseFn } from 'element-plus';
import type { UserReplyItem, UserTopic, UserTopicDetail, UserTopicStatus } from '@/types';

import 'viewerjs/dist/viewer.css';

const PAGE_SIZE = 106;
const createTopicLinkRegExp = /\/t\/create\/(\w+)/;

const storage = useStorageStore();
const { options } = storeToRefs(storage);
const { closeOnClickModal } = useClickModal(DialogType.TopicViewer);
const { dialogVisible, openDialog, closeDialog } = useDialog();
const { isLoading, handleRequest, resetRequestState } = useRequest();
const topicId = ref<string>();
const topicDetail = ref<UserTopicDetail>();
const topicStatus = ref<UserTopicStatus>();
const replyTotal = ref<string>('0');
const isTopicPage = ref<boolean>(false);

const showReply = computed(() => {
  return replyTotal.value !== '0';
});

const isTopicLinkBlank = computed(() => {
  if (!options.value) {
    return false;
  }

  const { checkedLinkTypes } = options.value[OptionsKey.BlankLink];
  return checkedLinkTypes.includes(LinkElementType.Topic);
});

const getTopicCallback = async (page: number): Promise<UserReplyItem[]> => {
  const {
    detail,
    status,
    reply: { total, list },
  } = await getUserTopic(topicId.value, page);

  topicDetail.value = detail;
  topicStatus.value = status;
  replyTotal.value = total;

  return list;
};

const {
  dataList: replyList,
  scrollbar,
  isFirstPage,
  isFirstPageLoading,
  isFirstPageEmpty,
  isNextPageLoading,
  disableInfiniteScroll,
  errorOccurred,
  getFirstPageData,
  getNextPageData,
  reloadPageData,
  reloadFirstPageData,
  updateCurrentPageData,
  resetScrollLoadState,
  scrollToTop,
  scrollToBottom,
} = useScrollLoad<UserReplyItem>(PAGE_SIZE, getTopicCallback);

onBeforeMount(() => {
  insertTopicButton();

  const { pathname } = window.location;

  if (!topicLinkRegExp.test(pathname)) {
    return;
  }

  topicId.value = pathname.match(topicLinkRegExp)?.[1];
  isTopicPage.value = true;

  const {
    detail,
    status,
    reply: { total, list },
  } = parseUserTopic(document.body.innerHTML);

  /**
   * 新标签页查看主题时
   * 1. 若为首页数据，则直接使用解析当前 DOM 得到的主题数据（减少重复请求）
   * 2. 否则调用接口请求数据
   */
  if (total === '0' || list[0].replyNo === '1') {
    topicDetail.value = detail;
    topicStatus.value = status;
    replyTotal.value = total;
    updateCurrentPageData(total, list);
  } else {
    getFirstPageData();
  }

  hideGlobalLoading();
  openDialog();
});

onMounted(() => {
  const topicLinkElements = document.querySelectorAll<HTMLAnchorElement>(SELECTOR_TOPIC_LINK);

  topicLinkElements.forEach((element) => {
    const { href } = element;

    if (topicLinkRegExp.test(href)) {
      element.addEventListener('click', handleTopicClick);
    } else if (createTopicLinkRegExp.test(href)) {
      element.addEventListener('click', handleCreateTopicClick);
    }
  });

  emitter.on('clickTopic', handleTopicClick);
});

const CREATE_BTN_CLASS = 'gzk-create-btn';
const CREATE_BTN_LOAD_CLASS = CREATE_BTN_CLASS + '-loading';

const insertTopicButton = () => {
  const publishBtn = document.querySelector<HTMLButtonElement>('button.dropdown-toggle');
  const parentEle = publishBtn?.parentElement;

  if (publishBtn?.innerText.includes('发布新主题') && parentEle) {
    const button = document.createElement('a');
    const editIcon = document.createElement('div');
    const loadingIcon = document.createElement('div');

    button.href = '/t/create/water';
    button.className = `btn btn-primary ${CREATE_BTN_CLASS}`;
    editIcon.className = 'i-mdi-lead-pencil';
    loadingIcon.className = 'i-mdi-loading';

    parentEle.prepend(button);
    button.prepend(editIcon);
    button.prepend(loadingIcon);
    button.addEventListener('click', handleCreateTopicClick);
  }

  const nodePublishBtn = document.querySelector<HTMLAnchorElement>('.node-topics > .ui-header a[href^="/t/create"]');

  if (nodePublishBtn?.innerText.includes('创建新主题')) {
    const loadingIcon = document.createElement('div');
    loadingIcon.className = 'i-mdi-loading';
    nodePublishBtn.classList.add(CREATE_BTN_CLASS);
    nodePublishBtn.innerHTML = '<span>创建新主题</span>';
    nodePublishBtn.prepend(loadingIcon);
  }
};

const handleTopicClick = (e: Event) => {
  e.preventDefault();

  const { href } = e.target as HTMLAnchorElement;

  if (isTopicPage.value || isTopicLinkBlank.value) {
    window.open(href);
    return;
  }

  topicId.value = href.match(topicLinkRegExp)?.[1];
  openDialog();
  getFirstPageData();
};

const handleCreateTopicClick = async (e: Event) => {
  e.preventDefault();

  const createBtn = document.querySelector<HTMLAnchorElement>(`.${CREATE_BTN_CLASS}`);
  createBtn?.classList.add(CREATE_BTN_LOAD_CLASS);

  try {
    const createTopicLinkEle = e.currentTarget as HTMLAnchorElement;
    const href = createTopicLinkEle.getAttribute('href') as string;
    await waitTime(300);

    if (import.meta.env.PROD) {
      await request(href);
    }

    const node = href.match(createTopicLinkRegExp)?.[1];
    addTopic(node as string);
  } catch (err) {
    ElMessage.error((err as Error).message);
    console.error(err);
  } finally {
    createBtn?.classList.remove(CREATE_BTN_LOAD_CLASS);
    (document.activeElement as HTMLElement)?.blur();
  }
};

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

const handleTopicSended = (data: UserTopic) => {
  const {
    detail,
    reply: { total, list },
  } = data;

  topicDetail.value = detail;
  replyTotal.value = total;
  reloadFirstPageData(list);
  setTimeout(scrollToTop, 0);
};

const handleReplySended = (data: UserTopic) => {
  const {
    detail,
    reply: { total, list },
  } = data;

  topicDetail.value = detail;
  replyTotal.value = total;
  updateCurrentPageData(total, list);
};

const handleTopicDialogOpened = () => {
  replyEditor.value?.generateCreateHistoryId();
};

const handleTopicDialogBeforeClose: DialogBeforeCloseFn = (done) => {
  if (isImgViewerVisible() || isGlobalLoadingVisible() || replyEditor.value?.isEmojiPickerVisible()) {
    return;
  }

  done();
};

const handleTopicDialogClosed = () => {
  topicId.value = undefined;
  topicDetail.value = undefined;
  replyTotal.value = '0';
  currentScrollDistance.value = 0;

  isReplyEditorFullscreen.value = false;
  replyEditor.value?.resetEditHistoryId();
  replyEditor.value?.closeEditor();
  replyEditor.value?.clearContent();
  replyEditor.value?.resetEditorLayout();

  showTopicFooter();
  resetRequestState();
  resetScrollLoadState();
};

const SCROLL_BUTTON_VISIBLE_HEIGHT = 200;
const currentScrollDistance = ref(0);

const showScrollTopButton = computed(() => {
  return currentScrollDistance.value > SCROLL_BUTTON_VISIBLE_HEIGHT;
});

const showScrollBottomButton = computed(() => {
  if (!scrollbar.value?.wrapRef) {
    return false;
  }

  const { clientHeight, scrollHeight } = scrollbar.value.wrapRef;
  const remainScrollDistance = scrollHeight - clientHeight - currentScrollDistance.value;
  return remainScrollDistance > SCROLL_BUTTON_VISIBLE_HEIGHT;
});

const handleScroll = ({ scrollTop }: { scrollTop: number }) => {
  currentScrollDistance.value = scrollTop;
};

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
const topicFooterHeight = 50;

const replyEditorHeight = computed<number>(() => {
  return isReplyEditorFullscreen.value ? 400 : 315;
});

const currentFooterHeight = computed<number>(() => {
  return topicFooterVisible.value ? topicFooterHeight : replyEditorHeight.value;
});

const topicDialogVH = computed<number>(() => {
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
</script>

<template>
  <ElementConfig>
    <ElDialog
      v-model="dialogVisible"
      class="topic-dialog"
      :modal-class="isTopicPage ? 'topic-overlay' : ''"
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
      <div v-loading="isLoading || isFirstPageLoading" :style="topicBodyStyle">
        <ElScrollbar ref="scrollbar" @scroll="handleScroll">
          <div
            v-infinite-scroll="getNextPageData"
            v-viewer="viewerOptions"
            class="topic-container"
            :style="topicContainerStyle"
            :infinite-scroll-disabled="disableInfiniteScroll"
            :infinite-scroll-distance="100"
          >
            <TopicDetail v-if="topicDetail" v-bind="topicDetail" />
            <ElDivider v-if="topicDetail" border-style="dashed">
              <un-i-mdi-comment-processing-outline class="comment-icon" />
            </ElDivider>
            <TopicReply v-if="showReply" :total="replyTotal" :list="replyList" />
            <ElSkeleton v-if="isNextPageLoading" animated />
            <ElEmpty v-if="topicDetail && isFirstPageEmpty" :description="$t('enhancedTopic.noReply')" />
            <LoadError
              v-show="errorOccurred"
              :show-icon="isFirstPage"
              :error-text="$t('common.loadFailedAndRetry')"
              @retry="reloadPageData"
            />
          </div>
        </ElScrollbar>
        <Transition name="el-fade-in-linear" leave-active-class="">
          <ReplyEditor
            ref="replyEditor"
            class="topic-body-absolute"
            :topic-id="topicId"
            :reply-list="replyList"
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
          :height="topicFooterHeight"
          @favorite-topic="handleTopicFavorite"
          @like-topic="handleTopicLike"
          @edit-topic="handleTopicEdit"
          @block-topic="handleTopicBlock"
        />
      </div>
      <template #footer>
        <div class="topic-dialog-absolute topic-dialog-footer">
          <FadeTransition>
            <un-i-mdi-arrow-up-bold-box-outline
              v-show="showScrollTopButton"
              class="topic-operate-icon"
              @click="scrollToTop"
            />
          </FadeTransition>
          <FadeTransition>
            <un-i-mdi-arrow-down-bold-box-outline
              v-show="showScrollBottomButton"
              class="topic-operate-icon bottom-0"
              @click="scrollToBottom"
            />
          </FadeTransition>
        </div>
      </template>
    </ElDialog>
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
}

.topic-dialog,
.conversation-dialog {
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
.topic-editor-dialog,
.reply-editor-dialog,
.conversation-dialog,
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
.conversation-dialog {
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

.topic-dialog-footer {
  bottom: 0;
  height: 70px;
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
