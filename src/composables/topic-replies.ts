import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import { getUserTopic } from '@/api';
import {
  createFirstPageTopicData,
  createTopicPageSeed,
  getParsedTopicPage,
  updateReverseTopBatches,
  updateReverseTopPage,
} from '@/utils/topic-reply-pagination';
import {
  NestedReplyDisplay,
  OptionsKey,
  REPLY_PRELOAD_PAGE_COUNT,
  ReplyOrder,
  ReplyPreloadMode,
  TOPIC_REPLY_PAGE_SIZE,
} from '@/constants';
import { SELECTOR_TOPIC_REPLY_TOTAL } from '@/constants/selector';

import { useReplyBatchLoad } from './reply-batch-load';
import { useScrollLoad } from './scroll-load';

import type { ComputedRef, Ref } from 'vue';
import type { ElScrollbar } from 'element-plus';
import type {
  Options,
  PageDataSeed,
  UserReplyBatch,
  UserReplyItem,
  UserTopic,
  UserTopicDetail,
  UserTopicStatus,
} from '@/types';

interface UseTopicRepliesOptions {
  dialogVisible: Readonly<Ref<boolean>>;
  options: Readonly<Ref<Options | undefined>>;
  topicContainer: Ref<HTMLDivElement | null>;
}

interface LoadTopicRepliesOptions {
  pageSeeds?: PageDataSeed<UserTopic>[];
}

interface UseTopicRepliesResult {
  topicId: Ref<string | undefined>;
  topicDetail: Ref<UserTopicDetail | undefined>;
  topicStatus: Ref<UserTopicStatus | undefined>;
  replyTotal: Ref<string>;
  onlyOriginalPoster: Ref<boolean>;
  isTopicRefreshing: Ref<boolean>;
  isTopicPreloadLoading: Ref<boolean>;
  isReplyInitialLoading: Ref<boolean>;
  isReverseReply: ComputedRef<boolean>;
  showReply: ComputedRef<boolean>;
  nestedReplyDisplay: ComputedRef<NestedReplyDisplay>;
  multipleInsideOne: ComputedRef<boolean>;
  isNestedReplyEnabled: ComputedRef<boolean>;
  effectiveReplyList: ComputedRef<UserReplyItem[]>;
  displayedReplyList: ComputedRef<UserReplyItem[]>;
  replyBatches: Ref<UserReplyBatch[]>;
  isReplyFirstPageLoading: ComputedRef<boolean>;
  isReplyNextPageLoading: ComputedRef<boolean>;
  replyLoadError: ComputedRef<boolean>;
  showNoOriginalPosterReply: ComputedRef<boolean>;
  showContinueSearchOriginalPosterReply: ComputedRef<boolean>;
  disableReplyInfiniteScroll: ComputedRef<boolean>;
  isReplyFirstPage: ComputedRef<boolean>;
  scrollbar: Ref<InstanceType<typeof ElScrollbar> | null>;
  initReplyOrder: () => void;
  getParsedTopicPage: (search: string, total: string, list: UserReplyItem[]) => number;
  createTopicPageSeed: (page: number, data: UserTopic) => PageDataSeed<UserTopic> | undefined;
  loadTopicReplies: (loadOptions?: LoadTopicRepliesOptions) => Promise<void>;
  openTopic: (selectedTopicId: string | undefined) => void;
  resetTopicData: () => void;
  handleToggleReplyOrder: () => Promise<void>;
  handleToggleOriginalPoster: () => Promise<void>;
  refreshTopic: () => Promise<void>;
  handleTopicSended: (data: UserTopic) => void;
  handleReplySended: (data: UserTopic) => void;
  getNextReplyData: () => Promise<void>;
  reloadReplyData: () => void;
  scrollToTop: (smooth?: boolean) => void;
  scrollToBottom: (smooth?: boolean) => void;
  scrollBy: (options: ScrollToOptions, smooth?: boolean) => void;
}

export const useTopicReplies = ({
  dialogVisible,
  options,
  topicContainer,
}: UseTopicRepliesOptions): UseTopicRepliesResult => {
  const isTopicPreloadLoading = ref<boolean>(false);
  const topicPreloadError = ref<boolean>(false);
  const topicId = ref<string>();
  const topicDetail = ref<UserTopicDetail>();
  const topicStatus = ref<UserTopicStatus>();
  const replyTotal = ref<string>('0');
  const replyOrder = ref<ReplyOrder>(ReplyOrder.Asc);
  const onlyOriginalPoster = ref<boolean>(false);
  const isTopicRefreshing = ref<boolean>(false);
  const isReplyInitialLoading = ref(false);
  const replyNextLoadPending = ref<boolean>(false);

  let topicPreloadVersion = 0;
  let topicPreloadAbortController: AbortController | undefined;
  let replyReloadVersion = 0;
  let replyInitialLoadingVersion = 0;
  let replyNextLoadLockVersion = 0;
  let replyNextLoadLocked = false;

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

  const showReply = computed<boolean>(() => {
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
  } = useScrollLoad<UserReplyItem>(TOPIC_REPLY_PAGE_SIZE, getTopicCallback);

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
    pageSize: TOPIC_REPLY_PAGE_SIZE,
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
    [
      displayedReplyList,
      isReplyFirstPageLoading,
      isReplyNextPageLoading,
      disableReplyInfiniteScroll,
      onlyOriginalPoster,
    ],
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

      if (
        preloadVersion !== topicPreloadVersion ||
        abortController.signal.aborted ||
        topicId.value !== currentTopicId
      ) {
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
  const loadTopicReplyData = async (loadOptions?: LoadTopicRepliesOptions): Promise<void> => {
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
      const initialLastPage = Math.ceil(initialTotal / TOPIC_REPLY_PAGE_SIZE);
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

      const correctedLastPage = Math.ceil(Number(replyTotal.value) / TOPIC_REPLY_PAGE_SIZE);

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

    const totalPageNumber = pageSeeds[0]
      ? Math.ceil(Number(pageSeeds[0].data.reply.total) / TOPIC_REPLY_PAGE_SIZE)
      : undefined;

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

  const loadTopicReplies = async (loadOptions?: LoadTopicRepliesOptions): Promise<void> => {
    if (!topicId.value) {
      return;
    }

    const loadingVersion = ++replyInitialLoadingVersion;
    isReplyInitialLoading.value = true;

    try {
      await loadTopicReplyData(loadOptions);
    } finally {
      if (loadingVersion === replyInitialLoadingVersion) {
        isReplyInitialLoading.value = false;
      }
    }
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

    isTopicRefreshing.value = false;
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

    isTopicRefreshing.value = false;
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

  const refreshTopic = async (): Promise<void> => {
    if (isTopicRefreshing.value || !dialogVisible.value || !topicId.value) {
      return;
    }

    const reloadVersion = ++replyReloadVersion;
    const loadedTopicId = topicId.value;
    const loadedReplyOrder = replyOrder.value;
    const loadedOnlyOriginalPoster = onlyOriginalPoster.value;
    const loadedNestedReplyEnabled = isNestedReplyEnabled.value;

    isTopicRefreshing.value = true;
    resetTopicPreloadRequestState();
    resetReplyLoadState();

    try {
      await loadTopicReplies();

      if (
        reloadVersion !== replyReloadVersion ||
        topicId.value !== loadedTopicId ||
        replyOrder.value !== loadedReplyOrder ||
        onlyOriginalPoster.value !== loadedOnlyOriginalPoster ||
        isNestedReplyEnabled.value !== loadedNestedReplyEnabled ||
        !dialogVisible.value
      ) {
        return;
      }

      await nextTick();
      scrollToTop(false);
    } finally {
      if (reloadVersion === replyReloadVersion) {
        isTopicRefreshing.value = false;
      }
    }
  };

  /**
   * 倒序楼中楼：发回复后更新顶部 batch（正序最后一页所在批次）
   */
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

    replyReloadVersion++;
    isTopicRefreshing.value = false;
    resetReplyNextLoadLock();

    if (isReverseReply.value) {
      // 倒序下两种模式的数据形状不兼容（扁平为纯倒序、楼中楼为页组），直接重载首屏
      resetScrollLoadState();
      resetBatchLoadState();
      loadTopicReplies();
      return;
    }

    if (nestedReplyEnabled) {
      const firstPageData = createFirstPageTopicData({
        detail: topicDetail.value,
        status: topicStatus.value,
        total: replyTotal.value,
        list: replyList.value,
      });
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

  const openTopic = (selectedTopicId: string | undefined) => {
    resetReplyNextLoadLock();
    isTopicRefreshing.value = false;
    topicId.value = selectedTopicId;
    onlyOriginalPoster.value = false;
    replyReloadVersion++;
    initReplyOrder();

    loadTopicReplies();
  };

  const resetTopicData = () => {
    replyReloadVersion++;
    replyInitialLoadingVersion++;
    isTopicRefreshing.value = false;
    isReplyInitialLoading.value = false;
    topicId.value = undefined;
    topicDetail.value = undefined;
    replyTotal.value = '0';
    onlyOriginalPoster.value = false;
    initReplyOrder();
    resetTopicPreloadRequestState();
    resetReplyLoadState();
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
        replyBatches.value = updateReverseTopBatches({
          batches: replyBatches.value,
          oldTotal,
          newTotal: Number(total),
          lastPageList: list,
        });
      } else {
        updateLastPageData(total, list);
      }
      return;
    }

    if (isReverseReply.value) {
      replyList.value = updateReverseTopPage({
        replyList: replyList.value,
        oldTotal,
        newTotal: Number(total),
        lastPageList: list,
      });
      return;
    }

    updateCurrentPageData(total, list);
  };

  onUnmounted(() => {
    topicPreloadAbortController?.abort();
  });

  return {
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
  };
};
