<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import { debounce } from 'lodash-es';

import { useClickModal } from '@/composables/click-modal';
import { useDialog } from '@/composables/dialog';
import { useReplyBatchLoad } from '@/composables/reply-batch-load';
import { useRequest } from '@/composables/request';
import { useScrollLoad } from '@/composables/scroll-load';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { favoriteTopic, getEditedTopic, getUserTopic, likeTopic, parseUserTopic, unfavoriteTopic } from '@/api';
import {
  addUnit,
  blockTopics,
  blurActiveElement,
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
import {
  DialogType,
  LinkElementType,
  NestedReplyDisplay,
  OptionsKey,
  REPLY_PRELOAD_PAGE_COUNT,
  ReplyOrder,
  ReplyPreloadMode,
  topicLinkRegExp,
} from '@/constants';
import {
  ADD_REPLY_INJECTION_KEY,
  EDIT_REPLY_INJECTION_KEY,
  UPDATE_SCROLLBAR_INJECTION_KEY,
} from '@/constants/inject-key';
import { SUCCESS_CANCEL_FAVORITE_TOPIC, SUCCESS_FAVORITE_TOPIC, SUCCESS_LIKE } from '@/constants/res-msg';
import { SELECTOR_TOPIC_LINK, SELECTOR_TOPIC_REPLY_TOTAL } from '@/constants/selector';

import ElementConfig from './ElementConfig.vue';
import LoadError from './LoadError.vue';
import ReplyEditor from './ReplyEditor.vue';
import TopicDetail from './TopicDetail.vue';
import TopicEditor from './TopicEditor.vue';
import TopicFooter from './TopicFooter.vue';
import TopicReply from './TopicReply.vue';
import TopicUserInfoPopover from './TopicUserInfoPopover.vue';

import type { CSSProperties } from 'vue';
import type { DialogBeforeCloseFn } from 'element-plus';
import type {
  PageDataSeed,
  TopicAction,
  UserReplyBatch,
  UserReplyItem,
  UserTopic,
  UserTopicDetail,
  UserTopicStatus,
} from '@/types';

import 'viewerjs/dist/viewer.css';

const PAGE_SIZE = 106;
const ARROW_SCROLL_DISTANCE = 50;
const TOPIC_FOOTER_HEIGHT = 50;
const createTopicLinkRegExp = /\/t\/create\/(\w+)/;

const storage = useStorageStore();
const { options } = storeToRefs(storage);
const { closeOnClickModal } = useClickModal(DialogType.TopicViewer);
const { dialogVisible, openDialog, closeDialog } = useDialog();
const { isLoading, handleRequest, resetRequestState } = useRequest();
const isTopicPreloadLoading = ref<boolean>(false);
const topicPreloadError = ref<boolean>(false);
const topicId = ref<string>();
const topicDetail = ref<UserTopicDetail>();
const topicStatus = ref<UserTopicStatus>();
const replyTotal = ref<string>('0');
const isTopicPage = ref<boolean>(false);
const topicContainer = ref<HTMLDivElement | null>(null);
const replyOrder = ref<ReplyOrder>(ReplyOrder.Asc);
const onlyOriginalPoster = ref<boolean>(false);

let topicPreloadVersion = 0;
let topicPreloadAbortController: AbortController | undefined;
let replyReloadVersion = 0;
let replyNextLoadLockVersion = 0;
let replyNextLoadLocked = false;
let topicLinkElements: NodeListOf<HTMLAnchorElement>;
let insertedTopicButton: HTMLAnchorElement | undefined;
let nodePublishButton: HTMLAnchorElement | null;
let nodePublishButtonOriginalHtml: string | undefined;
let nodePublishButtonHadCreateClass = false;
const replyNextLoadPending = ref<boolean>(false);

const resetTopicPreloadRequestState = () => {
  topicPreloadVersion++;
  topicPreloadAbortController?.abort();
  topicPreloadAbortController = undefined;
  isTopicPreloadLoading.value = false;
  topicPreloadError.value = false;
};

const resetReplyNextLoadLock = () => {
  replyNextLoadLockVersion++;
  replyNextLoadLocked = false;
  replyNextLoadPending.value = false;
};

const isReverseReply = computed<boolean>(() => {
  return replyOrder.value === ReplyOrder.Desc;
});

const initReplyOrder = () => {
  replyOrder.value = options.value?.[OptionsKey.ReverseReplyOrder]?.checked ? ReplyOrder.Desc : ReplyOrder.Asc;
};

const getParsedTopicPage = (search: string, total: string, list: UserReplyItem[]) => {
  const requestedPage = Number(new URLSearchParams(search).get('p'));

  if (requestedPage > 0) {
    return requestedPage;
  }

  const firstReplyNo = Number(list[0]?.replyNo);

  if (firstReplyNo > 0) {
    return Math.ceil(firstReplyNo / PAGE_SIZE);
  }

  return total === '0' ? 1 : Math.max(Math.ceil(Number(total) / PAGE_SIZE), 1);
};

const createTopicPageSeed = (page: number, data: UserTopic): PageDataSeed<UserTopic> | undefined => {
  const total = Number(data.reply.total);
  const totalPageNumber = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  if (page < 1 || page > totalPageNumber || (total > 0 && data.reply.list.length === 0)) {
    return undefined;
  }

  return {
    page,
    data,
  };
};

const showReply = computed(() => {
  return replyTotal.value !== '0';
});

const nestedReplyDisplay = computed<NestedReplyDisplay>(() => {
  return options.value?.[OptionsKey.NestedReplyDisplay]?.display || NestedReplyDisplay.Indent;
});

const multipleInsideOne = computed<boolean>(() => {
  return options.value?.[OptionsKey.NestedReplyMultipleInsideOne]?.checked ?? true;
});

const replyPreloadMode = computed<ReplyPreloadMode>(() => {
  return options.value?.[OptionsKey.ReplyPreload]?.mode || ReplyPreloadMode.TwoPages;
});

const replyPreloadPageCount = computed<number>(() => {
  return REPLY_PRELOAD_PAGE_COUNT[replyPreloadMode.value] || REPLY_PRELOAD_PAGE_COUNT[ReplyPreloadMode.TwoPages];
});

const isNestedReplyEnabled = computed<boolean>(() => {
  return nestedReplyDisplay.value !== NestedReplyDisplay.Off;
});

const isOriginalPosterReply = (reply: UserReplyItem): boolean => {
  const authorId = topicDetail.value?.authorId;
  return reply.isOriginalPoster === true || (authorId !== undefined && reply.uid === authorId);
};

const isTopicLinkBlank = computed(() => {
  if (!options.value) {
    return false;
  }

  const { checkedLinkTypes } = options.value[OptionsKey.BlankLink];
  return checkedLinkTypes.includes(LinkElementType.Topic);
});

const getTopicCallback = async (page: number, signal: AbortSignal): Promise<UserReplyItem[]> => {
  const currentTopicId = topicId.value;

  if (!currentTopicId) {
    return [];
  }

  const {
    detail,
    status,
    reply: { total, list },
  } = await getUserTopic(currentTopicId, page, signal);

  if (signal.aborted || topicId.value !== currentTopicId) {
    return [];
  }

  topicDetail.value = detail;
  topicStatus.value = status;
  replyTotal.value = total;

  return list;
};

const {
  dataList: replyList,
  noMoreData: noMorePageData,
  scrollbar,
  isFirstPage,
  isFirstPageLoading,
  isNextPageLoading,
  disableInfiniteScroll,
  errorOccurred,
  getFirstPageData,
  getNextPageData,
  startForwardLoad,
  startReverseLoad,
  reloadPageData,
  reloadFirstPageData,
  updateCurrentPageData,
  replaceLoadedData,
  resetScrollLoadState,
  scrollToTop,
  scrollToBottom,
  scrollBy,
  scrollToElement,
  setPageCount: setReplyPageCount,
} = useScrollLoad<UserReplyItem>(PAGE_SIZE, getTopicCallback);

const handleBatchPageLoaded = (data: UserTopic, page: number) => {
  const {
    detail,
    status,
    reply: { total },
  } = data;

  replyTotal.value = total;

  if (page === 1) {
    topicDetail.value = detail;
    topicStatus.value = status;
  }
};

const {
  batches: replyBatches,
  dataList: nestedReplyList,
  noMoreData: noMoreBatchData,
  lastLoadedPage: lastNestedReplyPage,
  isLoading: isBatchLoading,
  isFirstBatchLoading,
  isNextBatchLoading,
  disableBatchLoad,
  errorOccurred: batchLoadError,
  startBatchLoad,
  getNextBatchData,
  reloadBatchData,
  setBatchPageCount,
  updateLastPageData,
  resetBatchLoadState,
} = useReplyBatchLoad({
  pageSize: PAGE_SIZE,
  requestCallback: async (id, page, signal) => {
    return getUserTopic(id, page, signal);
  },
  pageLoadedCallback: handleBatchPageLoaded,
  errorCallback: (err) => {
    ElMessage.error(err.message);
  },
});

const resetReplyLoadState = () => {
  resetReplyNextLoadLock();
  resetScrollLoadState();
  resetBatchLoadState();
};

const effectiveReplyList = computed<UserReplyItem[]>(() => {
  return isNestedReplyEnabled.value ? nestedReplyList.value : replyList.value;
});

const displayedReplyList = computed<UserReplyItem[]>(() => {
  if (!onlyOriginalPoster.value) {
    return effectiveReplyList.value;
  }

  const forcedFlatReplyList =
    isNestedReplyEnabled.value && isReverseReply.value
      ? replyBatches.value.flatMap(({ list }) => [...list].reverse())
      : effectiveReplyList.value;

  return forcedFlatReplyList.filter(isOriginalPosterReply);
});

const isReplyFirstPageLoading = computed<boolean>(() => {
  return isNestedReplyEnabled.value ? isFirstBatchLoading.value : isFirstPageLoading.value;
});

const isReplyNextPageLoading = computed<boolean>(() => {
  return isNestedReplyEnabled.value ? isNextBatchLoading.value : isNextPageLoading.value;
});

const replyLoadError = computed<boolean>(() => {
  return topicPreloadError.value || (isNestedReplyEnabled.value ? batchLoadError.value : errorOccurred.value);
});

const replyLoadCompleted = computed<boolean>(() => {
  return isNestedReplyEnabled.value ? noMoreBatchData.value : noMorePageData.value;
});

const showNoOriginalPosterReply = computed<boolean>(() => {
  return (
    topicDetail.value !== undefined &&
    Number(replyTotal.value) > 0 &&
    onlyOriginalPoster.value &&
    displayedReplyList.value.length === 0 &&
    replyLoadCompleted.value &&
    !isTopicPreloadLoading.value &&
    !isReplyFirstPageLoading.value &&
    !isReplyNextPageLoading.value &&
    !replyLoadError.value
  );
});

const canLoadNextReply = computed<boolean>(() => {
  return (
    !replyLoadCompleted.value &&
    !isTopicPreloadLoading.value &&
    !isReplyFirstPageLoading.value &&
    !isReplyNextPageLoading.value &&
    !replyLoadError.value
  );
});

const showContinueSearchOriginalPosterReply = computed<boolean>(() => {
  return onlyOriginalPoster.value && canLoadNextReply.value && !replyNextLoadPending.value;
});

const shouldPauseOriginalPosterAutoLoad = computed<boolean>(() => {
  return onlyOriginalPoster.value && displayedReplyList.value.length === 0;
});

const disableReplyInfiniteScroll = computed<boolean>(() => {
  const disableReplyLoad = isNestedReplyEnabled.value ? disableBatchLoad.value : disableInfiniteScroll.value;
  return disableReplyLoad || shouldPauseOriginalPosterAutoLoad.value;
});

const isReplyFirstPage = computed<boolean>(() => {
  return isNestedReplyEnabled.value ? replyBatches.value.length === 0 : isFirstPage.value;
});

const checkFilteredReplyLoad = async () => {
  if (!onlyOriginalPoster.value || !dialogVisible.value) {
    return;
  }

  await nextTick();

  const wrapRef = scrollbar.value?.wrapRef;

  if (!wrapRef || !onlyOriginalPoster.value || disableReplyInfiniteScroll.value) {
    return;
  }

  const remainingScrollDistance = wrapRef.scrollHeight - wrapRef.clientHeight - wrapRef.scrollTop;

  if (remainingScrollDistance <= 100 && canLoadNextReply.value && !replyNextLoadLocked) {
    replyNextLoadPending.value = true;
    getNextReplyData();
  }
};

watch(
  [displayedReplyList, isReplyFirstPageLoading, isReplyNextPageLoading, disableReplyInfiniteScroll, onlyOriginalPoster],
  () => {
    checkFilteredReplyLoad();
  },
  { flush: 'post' },
);

watch(isBatchLoading, async (loading) => {
  if (!loading || replyBatches.value.length === 0) {
    return;
  }

  await nextTick();
  scrollToBottom();
});

const getNextReplyData = async (): Promise<void> => {
  if (replyNextLoadLocked || !canLoadNextReply.value) {
    return;
  }

  const lockVersion = replyNextLoadLockVersion;
  replyNextLoadLocked = true;
  replyNextLoadPending.value = true;

  try {
    if (isNestedReplyEnabled.value) {
      await getNextBatchData();
      return;
    }

    await getNextPageData();
  } finally {
    if (lockVersion === replyNextLoadLockVersion) {
      replyNextLoadLocked = false;
      replyNextLoadPending.value = false;
    }
  }
};

const reloadReplyData = () => {
  if (topicPreloadError.value) {
    resetTopicPreloadRequestState();
    loadTopicReplies();
    return;
  }

  if (isNestedReplyEnabled.value) {
    reloadBatchData();
    return;
  }

  reloadPageData();
};

/**
 * 倒序首屏预请求：获取最新回复总数并缓存第一页数据
 */
const preloadFirstPageTopic = async (): Promise<UserTopic | undefined> => {
  const currentTopicId = topicId.value;

  if (!currentTopicId) {
    return undefined;
  }

  const preloadVersion = ++topicPreloadVersion;
  topicPreloadAbortController?.abort();

  const abortController = new AbortController();
  topicPreloadAbortController = abortController;
  isTopicPreloadLoading.value = true;
  topicPreloadError.value = false;

  try {
    const firstPageData = await getUserTopic(currentTopicId, 1, abortController.signal);

    if (preloadVersion !== topicPreloadVersion || abortController.signal.aborted || topicId.value !== currentTopicId) {
      return undefined;
    }

    topicDetail.value = firstPageData.detail;
    topicStatus.value = firstPageData.status;
    replyTotal.value = firstPageData.reply.total;
    return firstPageData;
  } catch (err) {
    if (preloadVersion !== topicPreloadVersion || abortController.signal.aborted) {
      return undefined;
    }

    topicPreloadError.value = true;
    ElMessage.error((err as Error).message);
    console.error(err);
    return undefined;
  } finally {
    if (preloadVersion === topicPreloadVersion) {
      topicPreloadAbortController = undefined;
      isTopicPreloadLoading.value = false;
    }
  }
};

/**
 * 当前主题加载是否已失效（用户已切换主题或关闭对话框）
 */
const isTopicLoadStale = (loadedTopicId: string): boolean => {
  return topicId.value !== loadedTopicId || !dialogVisible.value;
};

/**
 * 回复加载统一入口：按当前顺序与展示模式分发到对应的加载链路
 */
const loadTopicReplies = async (loadOptions?: { pageSeeds?: PageDataSeed<UserTopic>[] }) => {
  const loadedTopicId = topicId.value;
  const loadedReplyOrder = replyOrder.value;
  const loadedNestedReplyEnabled = isNestedReplyEnabled.value;
  const loadedOnlyOriginalPoster = onlyOriginalPoster.value;

  if (!loadedTopicId) {
    return;
  }

  let pageSeeds = [...(loadOptions?.pageSeeds || [])];

  if (pageSeeds.length === 0) {
    const firstPageData = await preloadFirstPageTopic();

    if (!firstPageData) {
      return;
    }

    pageSeeds = [
      {
        page: 1,
        data: firstPageData,
      },
    ];
  }

  if (
    isTopicLoadStale(loadedTopicId) ||
    replyOrder.value !== loadedReplyOrder ||
    isNestedReplyEnabled.value !== loadedNestedReplyEnabled ||
    onlyOriginalPoster.value !== loadedOnlyOriginalPoster
  ) {
    return;
  }

  if (loadedReplyOrder === ReplyOrder.Desc) {
    const initialPageSeed = pageSeeds[0];

    if (!initialPageSeed) {
      return;
    }

    const initialTotal = Number(initialPageSeed.data.reply.total);
    const initialLastPage = Math.ceil(initialTotal / PAGE_SIZE);
    const loadReverseData = async (
      lastPage: number,
      total: number,
      cachedPageSeeds: PageDataSeed<UserTopic>[],
    ): Promise<void> => {
      if (loadedNestedReplyEnabled) {
        await startBatchLoad(loadedTopicId, replyPreloadPageCount.value, {
          pageSeeds: cachedPageSeeds,
          reverse: true,
          knownTotal: total,
        });
        return;
      }

      const replyPageSeeds: PageDataSeed<UserReplyItem[]>[] = cachedPageSeeds.map(({ page, data }) => {
        return {
          page,
          data: data.reply.list,
        };
      });
      await startReverseLoad(lastPage, replyPageSeeds);
    };

    await loadReverseData(initialLastPage, initialTotal, pageSeeds);

    if (
      isTopicLoadStale(loadedTopicId) ||
      replyOrder.value !== loadedReplyOrder ||
      isNestedReplyEnabled.value !== loadedNestedReplyEnabled ||
      onlyOriginalPoster.value !== loadedOnlyOriginalPoster
    ) {
      return;
    }

    const correctedLastPage = Math.ceil(Number(replyTotal.value) / PAGE_SIZE);

    if (correctedLastPage !== initialLastPage) {
      const correctedPageSeeds: PageDataSeed<UserTopic>[] = pageSeeds
        .filter(({ page }) => page <= Math.max(correctedLastPage, 1))
        .map(({ page, data }) => {
          return {
            page,
            data: {
              ...data,
              reply: {
                ...data.reply,
                total: replyTotal.value,
              },
            },
          };
        });
      await loadReverseData(correctedLastPage, Number(replyTotal.value), correctedPageSeeds);
    }

    return;
  }

  const totalPageNumber = pageSeeds[0] ? Math.ceil(Number(pageSeeds[0].data.reply.total) / PAGE_SIZE) : undefined;

  if (loadedNestedReplyEnabled) {
    await startBatchLoad(loadedTopicId, replyPreloadPageCount.value, {
      pageSeeds,
    });
    return;
  }

  const replyPageSeeds: PageDataSeed<UserReplyItem[]>[] = pageSeeds.map(({ page, data }) => {
    return {
      page,
      data: data.reply.list,
    };
  });
  await startForwardLoad(replyPageSeeds, totalPageNumber);
};

const scrollToReplyTotal = async (): Promise<void> => {
  await nextTick();

  let replyTotalElement = topicContainer.value?.querySelector<HTMLElement>(SELECTOR_TOPIC_REPLY_TOTAL);

  if (!replyTotalElement) {
    await nextTick();
    replyTotalElement = topicContainer.value?.querySelector<HTMLElement>(SELECTOR_TOPIC_REPLY_TOTAL);
  }

  if (replyTotalElement) {
    scrollToElement(replyTotalElement);
  }
};

const handleToggleReplyOrder = async (): Promise<void> => {
  const reloadVersion = ++replyReloadVersion;
  const loadedTopicId = topicId.value;
  const nextReplyOrder = isReverseReply.value ? ReplyOrder.Asc : ReplyOrder.Desc;
  const loadedOnlyOriginalPoster = onlyOriginalPoster.value;

  resetTopicPreloadRequestState();
  replyOrder.value = nextReplyOrder;

  resetReplyLoadState();
  await loadTopicReplies();

  if (
    reloadVersion !== replyReloadVersion ||
    topicId.value !== loadedTopicId ||
    replyOrder.value !== nextReplyOrder ||
    onlyOriginalPoster.value !== loadedOnlyOriginalPoster
  ) {
    return;
  }

  await scrollToReplyTotal();
};

const handleToggleOriginalPoster = async (): Promise<void> => {
  const reloadVersion = ++replyReloadVersion;
  const loadedTopicId = topicId.value;
  const loadedReplyOrder = replyOrder.value;
  const nextOnlyOriginalPoster = !onlyOriginalPoster.value;

  resetTopicPreloadRequestState();
  onlyOriginalPoster.value = nextOnlyOriginalPoster;

  resetReplyLoadState();
  await loadTopicReplies();

  if (
    reloadVersion !== replyReloadVersion ||
    topicId.value !== loadedTopicId ||
    replyOrder.value !== loadedReplyOrder ||
    onlyOriginalPoster.value !== nextOnlyOriginalPoster
  ) {
    return;
  }

  await scrollToReplyTotal();
};

/**
 * 倒序楼中楼：发回复后更新顶部 batch（正序最后一页所在批次）
 */
const updateReverseTopBatch = (oldTotal: number, newTotal: number, lastPageList: UserReplyItem[]) => {
  const newLastPage = Math.ceil(newTotal / PAGE_SIZE);
  const oldLastPage = Math.ceil(oldTotal / PAGE_SIZE);

  if (newLastPage < oldLastPage) {
    return;
  }

  if (newLastPage > oldLastPage) {
    const newBatch: UserReplyBatch = {
      startPage: newLastPage,
      endPage: newLastPage,
      list: lastPageList,
    };

    replyBatches.value = [newBatch, ...replyBatches.value];
    return;
  }

  const topBatch = replyBatches.value[0];

  if (!topBatch || topBatch.endPage !== oldLastPage) {
    return;
  }

  const oldTopPageLength = oldTotal - (oldLastPage - 1) * PAGE_SIZE;
  const reservedList = topBatch.list.slice(0, Math.max(topBatch.list.length - oldTopPageLength, 0));
  const updatedTopBatch: UserReplyBatch = {
    ...topBatch,
    list: reservedList.concat(lastPageList),
  };

  replyBatches.value = [updatedTopBatch, ...replyBatches.value.slice(1)];
};

/**
 * 倒序扁平：发回复后更新顶部页（正序最后一页）
 */
const updateReverseTopPage = (oldTotal: number, newTotal: number, lastPageList: UserReplyItem[]) => {
  const newLastPage = Math.ceil(newTotal / PAGE_SIZE);
  const oldLastPage = Math.ceil(oldTotal / PAGE_SIZE);

  if (newLastPage < oldLastPage) {
    return;
  }

  const reversedList = [...lastPageList].reverse();

  if (newLastPage > oldLastPage) {
    replyList.value = reversedList.concat(replyList.value);
    return;
  }

  const oldTopPageLength = oldTotal - (oldLastPage - 1) * PAGE_SIZE;
  replyList.value = reversedList.concat(replyList.value.slice(oldTopPageLength));
};

const getFirstPageTopicData = (list: UserReplyItem[]): UserTopic | undefined => {
  if (!topicDetail.value || !topicStatus.value) {
    return undefined;
  }

  return {
    detail: topicDetail.value,
    status: topicStatus.value,
    reply: {
      total: replyTotal.value,
      list: list.slice(0, PAGE_SIZE),
    },
  };
};

watch(
  replyPreloadPageCount,
  (pageCount) => {
    setReplyPageCount(pageCount);
    setBatchPageCount(pageCount);
  },
  { immediate: true },
);

watch(isNestedReplyEnabled, (nestedReplyEnabled, previousNestedReplyEnabled) => {
  if (nestedReplyEnabled === previousNestedReplyEnabled || !topicId.value || !dialogVisible.value) {
    return;
  }

  resetReplyNextLoadLock();

  if (isReverseReply.value) {
    // 倒序下两种模式的数据形状不兼容（扁平为纯倒序、楼中楼为页组），直接重载首屏
    resetScrollLoadState();
    resetBatchLoadState();
    loadTopicReplies();
    return;
  }

  if (nestedReplyEnabled) {
    const firstPageData = getFirstPageTopicData(replyList.value);
    resetScrollLoadState();
    startBatchLoad(topicId.value, replyPreloadPageCount.value, {
      pageSeeds: firstPageData
        ? [
            {
              page: 1,
              data: firstPageData,
            },
          ]
        : [],
    });
    return;
  }

  const loadedReplyList = nestedReplyList.value;
  const loadedPage = lastNestedReplyPage.value;
  const isComplete = loadedReplyList.length >= Number(replyTotal.value);
  resetBatchLoadState();

  if (loadedReplyList.length) {
    replaceLoadedData(loadedPage, loadedReplyList, isComplete);
  } else if (Number(replyTotal.value) > 0) {
    getFirstPageData();
  }
});

onBeforeMount(() => {
  insertTopicButton();

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

onMounted(() => {
  topicLinkElements = document.querySelectorAll<HTMLAnchorElement>(SELECTOR_TOPIC_LINK);

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

onUnmounted(() => {
  topicPreloadAbortController?.abort();
  document.removeEventListener('keydown', handleKeydown);

  topicLinkElements?.forEach((element) => {
    element.removeEventListener('click', handleTopicClick);
    element.removeEventListener('click', handleCreateTopicClick);
  });

  emitter.off('clickTopic', handleTopicClick);
  insertedTopicButton?.removeEventListener('click', handleCreateTopicClick);
  insertedTopicButton?.remove();

  if (nodePublishButton && nodePublishButtonOriginalHtml !== undefined) {
    nodePublishButton.innerHTML = nodePublishButtonOriginalHtml;
    nodePublishButton.classList.toggle(CREATE_BTN_CLASS, nodePublishButtonHadCreateClass);
  }
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
    insertedTopicButton = button;
  }

  const nodePublishBtn = document.querySelector<HTMLAnchorElement>('.node-topics > .ui-header a[href^="/t/create"]');

  if (nodePublishBtn?.innerText.includes('创建新主题')) {
    nodePublishButton = nodePublishBtn;
    nodePublishButtonOriginalHtml = nodePublishBtn.innerHTML;
    nodePublishButtonHadCreateClass = nodePublishBtn.classList.contains(CREATE_BTN_CLASS);

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

  resetReplyNextLoadLock();
  topicId.value = href.match(topicLinkRegExp)?.[1];
  onlyOriginalPoster.value = false;
  replyReloadVersion++;
  initReplyOrder();
  openDialog();

  loadTopicReplies();
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
  resetReplyNextLoadLock();

  if (isReverseReply.value) {
    loadTopicReplies({
      pageSeeds: [
        {
          page: 1,
          data,
        },
      ],
    });
  } else if (isNestedReplyEnabled.value && topicId.value) {
    startBatchLoad(topicId.value, replyPreloadPageCount.value, {
      pageSeeds: [
        {
          page: 1,
          data,
        },
      ],
    });
  } else {
    reloadFirstPageData(list, Number(total));
  }

  setTimeout(scrollToTop, 0);
};

const handleReplySended = (data: UserTopic) => {
  const {
    detail,
    reply: { total, list },
  } = data;

  const oldTotal = Number(replyTotal.value);

  topicDetail.value = detail;
  replyTotal.value = total;

  if (isNestedReplyEnabled.value) {
    if (isReverseReply.value) {
      updateReverseTopBatch(oldTotal, Number(total), list);
    } else {
      updateLastPageData(total, list);
    }
    return;
  }

  if (isReverseReply.value) {
    updateReverseTopPage(oldTotal, Number(total), list);
    return;
  }

  updateCurrentPageData(total, list);
};

const handleTopicDialogOpened = () => {
  blurActiveElement();
  document.addEventListener('keydown', handleKeydown);
  replyEditor.value?.generateCreateHistoryId();
};

const handleTopicDialogBeforeClose: DialogBeforeCloseFn = (done) => {
  if (isImgViewerVisible() || isGlobalLoadingVisible() || replyEditor.value?.isEmojiPickerVisible()) {
    return;
  }

  done();
};

const handleTopicDialogClosed = () => {
  document.removeEventListener('keydown', handleKeydown);
  replyReloadVersion++;

  topicId.value = undefined;
  topicDetail.value = undefined;
  replyTotal.value = '0';
  onlyOriginalPoster.value = false;
  initReplyOrder();

  isReplyEditorFullscreen.value = false;
  replyEditor.value?.resetEditHistoryId();
  replyEditor.value?.closeEditor();
  replyEditor.value?.clearContent();
  replyEditor.value?.resetEditorLayout();

  showTopicFooter();
  resetRequestState();
  resetTopicPreloadRequestState();
  resetReplyLoadState();
};

const handleKeydown = (e: KeyboardEvent) => {
  if (isImgViewerVisible() || isGlobalLoadingVisible()) {
    return;
  }

  const wrapRef = scrollbar.value?.wrapRef;

  if (!wrapRef) {
    return;
  }

  // 如果同时有多个对话框，不处理快捷键
  const overlayEle = [...document.querySelectorAll<HTMLElement>('.el-overlay')].filter(
    (item) => item.style.display !== 'none',
  );

  if (overlayEle.length > 1) {
    return;
  }

  // 如果焦点在输入框中，不处理快捷键
  const activeElement = document.activeElement;

  if (
    activeElement?.tagName === 'INPUT' ||
    activeElement?.tagName === 'TEXTAREA' ||
    activeElement?.tagName === 'BUTTON' ||
    activeElement?.closest('.cherry-editor') ||
    activeElement?.closest('.el-select__wrapper') ||
    activeElement?.closest('.el-dropdown') ||
    activeElement?.closest('.el-dropdown__popper')
  ) {
    return;
  }

  // PageUp/PageDown/Space 滚动距离为视口高度的 90%
  const pageScrollDistance = wrapRef.clientHeight * 0.9;

  switch (e.key) {
    case 'Home':
      e.preventDefault();
      scrollToTop();
      break;
    case 'End':
      e.preventDefault();
      scrollToBottom();
      break;
    case 'PageUp':
      e.preventDefault();
      scrollBy({ top: -pageScrollDistance });
      break;
    case 'PageDown':
      e.preventDefault();
      scrollBy({ top: pageScrollDistance });
      break;
    case 'ArrowUp':
      e.preventDefault();
      scrollBy({ top: -ARROW_SCROLL_DISTANCE });
      break;
    case 'ArrowDown':
      e.preventDefault();
      scrollBy({ top: ARROW_SCROLL_DISTANCE });
      break;
    case ' ':
      e.preventDefault();
      scrollBy({ top: e.shiftKey ? -pageScrollDistance : pageScrollDistance }); // Shift + Space 向上翻页，Space 向下翻页
      break;
  }
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

const handleExportTopic = () => {
  // TODO: 导出主题
};

const handleHotReplies = () => {
  // TODO: 热门回复
};

const handleRefreshTopic = () => {
  // TODO: 刷新主题
};

// @unocss-include
const topicActions = computed<readonly TopicAction[]>(() => {
  return [
    { label: t('enhancedTopic.exportTopic'), iconClass: 'i-mdi-tray-arrow-down', handler: handleExportTopic },
    { label: t('enhancedTopic.hotReplies'), iconClass: 'i-mdi-heart-outline', handler: handleHotReplies },
    { label: t('enhancedTopic.refreshTopic'), iconClass: 'i-mdi-refresh', handler: handleRefreshTopic },
    { label: t('enhancedTopic.scrollToTop'), iconClass: 'i-mdi-arrow-up', handler: scrollToTop, showDivider: true },
    { label: t('enhancedTopic.scrollToBottom'), iconClass: 'i-mdi-arrow-down', handler: scrollToBottom },
  ];
});

const replyEditorHeight = computed<number>(() => {
  return isReplyEditorFullscreen.value ? 400 : 315;
});

const currentFooterHeight = computed<number>(() => {
  return topicFooterVisible.value ? TOPIC_FOOTER_HEIGHT : replyEditorHeight.value;
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
      :class="['topic-dialog', { 'topic-page-dialog': isTopicPage }]"
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
      <div v-loading="isLoading || isTopicPreloadLoading || isReplyFirstPageLoading" :style="topicBodyStyle">
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
          @favorite-topic="handleTopicFavorite"
          @like-topic="handleTopicLike"
          @edit-topic="handleTopicEdit"
          @block-topic="handleTopicBlock"
          @toggle-reply-order="handleToggleReplyOrder"
          @toggle-original-poster="handleToggleOriginalPoster"
        />
      </div>
      <template #footer>
        <div class="topic-action-rail">
          <div
            v-for="action in topicActions"
            :key="action.label"
            :class="['topic-action-item', { 'topic-action-item-divided': action.showDivider }]"
          >
            <ElTooltip :content="action.label" :enterable="false" :hide-after="0" placement="left">
              <button class="topic-action-button" type="button" :aria-label="action.label" @click="action.handler()">
                <span :class="['topic-action-button-icon', action.iconClass]"></span>
              </button>
            </ElTooltip>
          </div>
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
.editor-history-dialog {
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

.topic-action-rail {
  position: absolute;
  right: -48px;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.topic-action-item {
  position: relative;
  width: 36px;
  height: 36px;
}

.topic-action-item-divided {
  margin-top: 12px;

  &::before {
    position: absolute;
    top: -11px;
    left: 50%;
    width: 24px;
    height: 2px;
    pointer-events: none;
    content: '';
    background-color: var(--el-border-color-darker);
    border-radius: 1px;
    transform: translateX(-50%);
  }
}

.topic-action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-light);
  transition: color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover,
  &:focus-visible {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary);
    outline: none;
    box-shadow: 0 4px 12px rgb(var(--el-color-primary-rgb) 0.18);
  }

  &:active {
    transform: scale(0.94);
  }
}

.topic-action-button-icon {
  font-size: 16px;
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
