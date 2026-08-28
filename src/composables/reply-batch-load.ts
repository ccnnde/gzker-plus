import { computed, ref } from 'vue';

import { ReplyOrder } from '@/constants';

import { usePageLoadSession } from './page-load-session';

import type { ComputedRef, Ref } from 'vue';
import type { PageDataSeed, PageLoadContext, PageLoadRunner, UserReplyBatch, UserReplyItem, UserTopic } from '@/types';

interface UseReplyBatchLoadOptions {
  pageSize: number;
  requestCallback: (topicId: string, page: number, signal: AbortSignal) => Promise<UserTopic>;
  pageLoadedCallback: (data: UserTopic, page: number) => void;
  errorCallback: (error: Error) => void;
}

interface StartBatchLoadOptions {
  /**
   * 倒序加载（从最后一页向第一页递减）
   */
  reverse?: boolean;

  /**
   * 已知的回复总数，倒序加载时用于计算起始页码和修正跨页变化
   */
  knownTotal?: number;

  /**
   * 已解析或已请求的页面数据，仅写入缓存，加载游标到达时再显示
   */
  pageSeeds?: PageDataSeed<UserTopic>[];
}

interface UseReplyBatchLoadResult {
  batches: Ref<UserReplyBatch[]>;
  dataList: ComputedRef<UserReplyItem[]>;
  lastLoadedPage: Ref<number>;
  isLoading: Ref<boolean>;
  isFirstBatchLoading: ComputedRef<boolean>;
  isNextBatchLoading: ComputedRef<boolean>;
  disableBatchLoad: ComputedRef<boolean>;
  errorOccurred: Ref<boolean>;
  startBatchLoad: (topicId: string, batchPageCount: number, options?: StartBatchLoadOptions) => Promise<void>;
  getNextBatchData: () => Promise<void>;
  reloadBatchData: () => Promise<void>;
  setBatchPageCount: (batchPageCount: number) => void;
  updateLastPageData: (total: string, lastPageData: UserReplyItem[]) => void;
  resetBatchLoadState: () => void;
}

export const useReplyBatchLoad = ({
  pageSize,
  requestCallback,
  pageLoadedCallback,
  errorCallback,
}: UseReplyBatchLoadOptions): UseReplyBatchLoadResult => {
  const batches = ref<UserReplyBatch[]>([]);
  const lastLoadedPage = ref<number>(0);
  const noMoreData = ref<boolean>(true);
  const { isLoading, errorOccurred, isReverse, startSession, runLoad, retryLoad, cancelLoad, resetSession } =
    usePageLoadSession({
      errorCallback,
    });

  const pageCache = new Map<number, UserReplyItem[]>();

  let currentTopicId = '';
  let currentBatchPageCount = 1;
  let totalReplyNumber = 0;

  const dataList = computed<UserReplyItem[]>(() => {
    return batches.value.flatMap(({ list }) => list);
  });

  const isFirstBatchLoading = computed<boolean>(() => {
    return isLoading.value && batches.value.length === 0;
  });

  const isNextBatchLoading = computed<boolean>(() => {
    return isLoading.value && batches.value.length > 0;
  });

  const disableBatchLoad = computed<boolean>(() => {
    return isLoading.value || errorOccurred.value || noMoreData.value;
  });

  const getTotalPageNumber = (): number => {
    return Math.ceil(totalReplyNumber / pageSize);
  };

  const updatePageData = (page: number, data: UserTopic) => {
    totalReplyNumber = Number(data.reply.total);
    pageCache.set(page, data.reply.list);
    pageLoadedCallback(data, page);
  };

  const getPageNumbers = (firstPage: number, lastPage: number): number[] => {
    return Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
  };

  const loadPageNumbers = async (pageNumbers: number[], context: PageLoadContext) => {
    const missingPageNumbers = pageNumbers.filter((page) => !pageCache.has(page));

    if (!missingPageNumbers.length) {
      return;
    }

    const results = await Promise.allSettled(
      missingPageNumbers.map(async (page) => {
        const data = await requestCallback(currentTopicId, page, context.signal);

        return {
          data,
          page,
        };
      }),
    );

    if (!context.isCurrent()) {
      return;
    }

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        updatePageData(result.value.page, result.value.data);
      }
    });

    const rejectedResult = results.find((result) => result.status === 'rejected');

    if (rejectedResult?.status === 'rejected') {
      throw rejectedResult.reason;
    }
  };

  const commitBatch = (firstPage: number, lastPage: number, direction: ReplyOrder) => {
    const pageNumbers = getPageNumbers(firstPage, lastPage);
    const list = pageNumbers.flatMap((page) => pageCache.get(page) || []);
    const batch: UserReplyBatch = {
      startPage: firstPage,
      endPage: lastPage,
      list,
    };

    batches.value = [...batches.value, batch];
    lastLoadedPage.value = direction === ReplyOrder.Desc ? firstPage : lastPage;
    noMoreData.value = direction === ReplyOrder.Desc ? firstPage <= 1 : lastPage >= getTotalPageNumber();
  };

  const commitNextCachedBatch = (direction: ReplyOrder): boolean => {
    if (direction === ReplyOrder.Desc) {
      const boundaryPage = lastLoadedPage.value === 0 ? getTotalPageNumber() + 1 : lastLoadedPage.value;
      const nextPage = boundaryPage - 1;

      if (nextPage < 1) {
        noMoreData.value = true;
        return true;
      }

      const firstPage = Math.max(1, nextPage - currentBatchPageCount + 1);
      const pageNumbers = getPageNumbers(firstPage, nextPage);

      if (pageNumbers.some((page) => !pageCache.has(page))) {
        return false;
      }

      commitBatch(firstPage, nextPage, direction);
      return true;
    }

    const firstPage = lastLoadedPage.value + 1;

    if (firstPage === 1 && !pageCache.has(1)) {
      return false;
    }

    const totalPageNumber = getTotalPageNumber();

    if (totalPageNumber === 0) {
      noMoreData.value = true;
      return true;
    }

    const lastPage = Math.min(firstPage + currentBatchPageCount - 1, totalPageNumber);
    const pageNumbers = getPageNumbers(firstPage, lastPage);

    if (pageNumbers.some((page) => !pageCache.has(page))) {
      return false;
    }

    commitBatch(firstPage, lastPage, direction);
    return true;
  };

  const loadNextBatchData = async (runner: PageLoadRunner = runLoad): Promise<void> => {
    if (!currentTopicId || isLoading.value || noMoreData.value) {
      return;
    }

    const direction = isReverse.value ? ReplyOrder.Desc : ReplyOrder.Asc;

    if (commitNextCachedBatch(direction)) {
      return;
    }

    await runner(async (context) => {
      if (context.direction === ReplyOrder.Desc) {
        // 倒序：边界页（首屏为总页数 + 1 的虚拟边界）向下加载更旧的页
        const boundaryPage = lastLoadedPage.value === 0 ? getTotalPageNumber() + 1 : lastLoadedPage.value;
        const nextPage = boundaryPage - 1;

        if (nextPage < 1) {
          noMoreData.value = true;
          return;
        }

        const firstPage = Math.max(1, nextPage - currentBatchPageCount + 1);
        await loadPageNumbers(getPageNumbers(firstPage, nextPage), context);

        if (!context.isCurrent()) {
          return;
        }

        commitBatch(firstPage, nextPage, context.direction);
        return;
      }

      const firstPage = lastLoadedPage.value + 1;

      if (firstPage === 1 && !pageCache.has(1)) {
        await loadPageNumbers([1], context);
      }

      if (!context.isCurrent()) {
        return;
      }

      const totalPageNumber = getTotalPageNumber();

      if (totalPageNumber === 0) {
        noMoreData.value = true;
        return;
      }

      const lastPage = Math.min(firstPage + currentBatchPageCount - 1, totalPageNumber);
      const pageNumbers = getPageNumbers(firstPage, lastPage);
      await loadPageNumbers(pageNumbers, context);

      if (!context.isCurrent()) {
        return;
      }

      commitBatch(firstPage, lastPage, context.direction);
    });
  };

  const getNextBatchData = async (): Promise<void> => {
    await loadNextBatchData();
  };

  const startBatchLoad = async (topicId: string, batchPageCount: number, options?: StartBatchLoadOptions) => {
    const direction = options?.reverse ? ReplyOrder.Desc : ReplyOrder.Asc;
    startSession(direction);

    currentTopicId = '';
    totalReplyNumber = 0;
    pageCache.clear();
    batches.value = [];
    lastLoadedPage.value = 0;

    currentTopicId = topicId;
    currentBatchPageCount = batchPageCount;
    noMoreData.value = false;

    options?.pageSeeds?.forEach(({ page, data }) => {
      if (page > 0) {
        updatePageData(page, data);
      }
    });

    if (direction === ReplyOrder.Desc) {
      totalReplyNumber = Math.max(options?.knownTotal ?? totalReplyNumber, 0);
    }

    await getNextBatchData();
  };

  const reloadBatchData = async () => {
    noMoreData.value = false;
    await loadNextBatchData(retryLoad);
  };

  const setBatchPageCount = (batchPageCount: number) => {
    if (currentBatchPageCount === batchPageCount) {
      return;
    }

    currentBatchPageCount = batchPageCount;

    if (!isLoading.value && !errorOccurred.value) {
      return;
    }

    cancelLoad();
    noMoreData.value = false;
    getNextBatchData();
  };

  const updateLastPageData = (total: string, lastPageData: UserReplyItem[]) => {
    const previousNoMoreData = noMoreData.value;
    totalReplyNumber = Number(total);

    const lastPage = Math.max(getTotalPageNumber(), 1);

    if (lastPage > lastLoadedPage.value) {
      noMoreData.value = false;

      if (!previousNoMoreData || lastPage !== lastLoadedPage.value + 1) {
        return;
      }

      pageCache.set(lastPage, lastPageData);
      commitBatch(lastPage, lastPage, isReverse.value ? ReplyOrder.Desc : ReplyOrder.Asc);
      return;
    }

    pageCache.set(lastPage, lastPageData);

    const batchIndex = batches.value.findIndex(({ startPage, endPage }) => {
      return lastPage >= startPage && lastPage <= endPage;
    });

    if (batchIndex === -1) {
      return;
    }

    const currentBatch = batches.value[batchIndex];
    const pageNumbers = getPageNumbers(currentBatch.startPage, currentBatch.endPage);
    const list = pageNumbers.flatMap((page) => pageCache.get(page) || []);
    const updatedBatch: UserReplyBatch = {
      ...currentBatch,
      list,
    };

    batches.value.splice(batchIndex, 1, updatedBatch);
    noMoreData.value = lastLoadedPage.value >= getTotalPageNumber();
  };

  const resetBatchLoadState = () => {
    resetSession();

    currentTopicId = '';
    totalReplyNumber = 0;
    pageCache.clear();

    batches.value = [];
    lastLoadedPage.value = 0;
    noMoreData.value = true;
  };

  return {
    batches,
    dataList,
    lastLoadedPage,
    isLoading,
    isFirstBatchLoading,
    isNextBatchLoading,
    disableBatchLoad,
    errorOccurred,
    startBatchLoad,
    getNextBatchData,
    reloadBatchData,
    setBatchPageCount,
    updateLastPageData,
    resetBatchLoadState,
  };
};
