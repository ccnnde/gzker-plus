import { computed, ref } from 'vue';

import type { ComputedRef, Ref } from 'vue';
import type { UserReplyBatch, UserReplyItem, UserTopic } from '@/types';

interface UseReplyBatchLoadOptions {
  pageSize: number;
  requestCallback: (topicId: string, page: number, signal: AbortSignal) => Promise<UserTopic>;
  pageLoadedCallback: (data: UserTopic, page: number) => void;
  errorCallback: (error: Error) => void;
}

interface LoadContext {
  sessionVersion: number;
  loadVersion: number;
  signal: AbortSignal;
}

interface UseReplyBatchLoadResult {
  batches: Ref<UserReplyBatch[]>;
  dataList: ComputedRef<UserReplyItem[]>;
  lastLoadedPage: Ref<number>;
  isFirstBatchLoading: ComputedRef<boolean>;
  isNextBatchLoading: ComputedRef<boolean>;
  disableBatchLoad: ComputedRef<boolean>;
  errorOccurred: Ref<boolean>;
  startBatchLoad: (topicId: string, batchPageCount: number, firstPageData?: UserTopic) => Promise<void>;
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
  const isLoading = ref<boolean>(false);
  const errorOccurred = ref<boolean>(false);
  const noMoreData = ref<boolean>(true);

  const pageCache = new Map<number, UserReplyItem[]>();

  let currentTopicId = '';
  let currentBatchPageCount = 1;
  let totalReplyNumber = 0;
  let sessionVersion = 0;
  let loadVersion = 0;
  let abortController: AbortController | undefined;

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

  const isLoadContextCurrent = (context: LoadContext): boolean => {
    return context.sessionVersion === sessionVersion && context.loadVersion === loadVersion;
  };

  const updatePageData = (page: number, data: UserTopic) => {
    totalReplyNumber = Number(data.reply.total);
    pageCache.set(page, data.reply.list);
    pageLoadedCallback(data, page);
  };

  const getPageNumbers = (firstPage: number, lastPage: number): number[] => {
    return Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
  };

  const loadPageNumbers = async (pageNumbers: number[], context: LoadContext) => {
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

    if (!isLoadContextCurrent(context)) {
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

  const commitBatch = (firstPage: number, lastPage: number) => {
    const pageNumbers = getPageNumbers(firstPage, lastPage);
    const list = pageNumbers.flatMap((page) => pageCache.get(page) || []);
    const batch: UserReplyBatch = {
      startPage: firstPage,
      endPage: lastPage,
      list,
    };

    batches.value = [...batches.value, batch];
    lastLoadedPage.value = lastPage;
    noMoreData.value = lastPage >= getTotalPageNumber();
  };

  const getNextBatchData = async () => {
    if (!currentTopicId || isLoading.value || noMoreData.value) {
      return;
    }

    const currentSessionVersion = sessionVersion;
    const currentLoadVersion = ++loadVersion;
    abortController = new AbortController();
    const context: LoadContext = {
      sessionVersion: currentSessionVersion,
      loadVersion: currentLoadVersion,
      signal: abortController.signal,
    };

    isLoading.value = true;
    errorOccurred.value = false;

    try {
      const firstPage = lastLoadedPage.value + 1;

      if (firstPage === 1 && !pageCache.has(1)) {
        await loadPageNumbers([1], context);
      }

      if (!isLoadContextCurrent(context)) {
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

      if (!isLoadContextCurrent(context)) {
        return;
      }

      commitBatch(firstPage, lastPage);
    } catch (err) {
      if (!isLoadContextCurrent(context) || context.signal.aborted) {
        return;
      }

      errorOccurred.value = true;
      errorCallback(err as Error);
      console.error(err);
    } finally {
      if (isLoadContextCurrent(context)) {
        isLoading.value = false;
      }
    }
  };

  const startBatchLoad = async (topicId: string, batchPageCount: number, firstPageData?: UserTopic) => {
    resetBatchLoadState();

    currentTopicId = topicId;
    currentBatchPageCount = batchPageCount;
    noMoreData.value = false;

    if (firstPageData) {
      updatePageData(1, firstPageData);
    }

    await getNextBatchData();
  };

  const reloadBatchData = async () => {
    errorOccurred.value = false;
    noMoreData.value = false;
    await getNextBatchData();
  };

  const setBatchPageCount = (batchPageCount: number) => {
    if (currentBatchPageCount === batchPageCount) {
      return;
    }

    currentBatchPageCount = batchPageCount;

    if (!isLoading.value && !errorOccurred.value) {
      return;
    }

    loadVersion++;
    abortController?.abort();
    isLoading.value = false;
    errorOccurred.value = false;
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
      commitBatch(lastPage, lastPage);
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
    sessionVersion++;
    loadVersion++;
    abortController?.abort();
    abortController = undefined;

    currentTopicId = '';
    totalReplyNumber = 0;
    pageCache.clear();

    batches.value = [];
    lastLoadedPage.value = 0;
    isLoading.value = false;
    errorOccurred.value = false;
    noMoreData.value = true;
  };

  return {
    batches,
    dataList,
    lastLoadedPage,
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
