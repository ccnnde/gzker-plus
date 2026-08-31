import { computed, nextTick, ref } from 'vue';

import { ReplyOrder } from '@/constants';

import { usePageLoadSession } from './page-load-session';
import { useScrollbar } from './scrollbar';

import type { Ref } from 'vue';
import type { PageDataSeed, PageLoadRunner } from '@/types';

interface StartScrollLoadOptions<T> {
  pageSeeds?: PageDataSeed<T[]>[];
  totalPageNumber?: number;
}

interface CommitPageDataOptions<T> {
  page: number;
  data: T[][];
  replace: boolean;
  direction: ReplyOrder;
}

export const useScrollLoad = <T>(
  pageSize: number,
  requestCallback: (page: number, signal: AbortSignal) => Promise<T[]>,
) => {
  const { isLoading, errorOccurred, isReverse, startSession, runLoad, retryLoad, resetSession } = usePageLoadSession();
  const { scrollbar, scrollToTop, scrollToBottom, scrollBy, scrollToElement } = useScrollbar();
  const dataList = ref<T[]>([]) as Ref<T[]>;
  const currentPage = ref(1);
  const noMoreData = ref(true);
  const pageCache = new Map<number, T[]>();

  let knownTotalPageNumber: number | undefined;
  let currentPageCount = 1;

  const isFirstPage = computed(() => {
    return dataList.value.length === 0;
  });

  const isFirstPageLoading = computed(() => {
    return isFirstPage.value && isLoading.value;
  });

  const isFirstPageEmpty = computed(() => {
    return isFirstPage.value && !errorOccurred.value && dataList.value.length === 0;
  });

  const isNextPageLoading = computed(() => {
    return !isFirstPage.value && isLoading.value;
  });

  const disableInfiniteScroll = computed(() => {
    return isNextPageLoading.value || errorOccurred.value || noMoreData.value;
  });

  const isNoMoreData = computed<boolean>(() => {
    return noMoreData.value;
  });

  const getOrderedPageData = (pageData: T[], direction: ReplyOrder): T[] => {
    return direction === ReplyOrder.Desc ? [...pageData].reverse() : pageData;
  };

  const getPageNumbers = (startPage: number, direction: ReplyOrder): number[] => {
    const step = direction === ReplyOrder.Desc ? -1 : 1;

    return Array.from({ length: currentPageCount }, (_, index) => startPage + step * index).filter((page) => {
      return (
        page >= 1 &&
        (direction === ReplyOrder.Desc || knownTotalPageNumber === undefined || page <= knownTotalPageNumber)
      );
    });
  };

  const commitPageData = ({ page, data: pageData, replace, direction }: CommitPageDataOptions<T>) => {
    if (!replace && pageData.every((data) => data.length === 0)) {
      noMoreData.value = true;
      return;
    }

    const boundaryPageData = pageData[direction === ReplyOrder.Desc ? 0 : pageData.length - 1] || [];
    currentPage.value = page;
    noMoreData.value =
      direction === ReplyOrder.Desc
        ? currentPage.value <= 1
        : knownTotalPageNumber === undefined
        ? boundaryPageData.length < pageSize
        : currentPage.value >= knownTotalPageNumber;

    const orderedPageData = pageData.flatMap((data) => getOrderedPageData(data, direction));

    if (replace) {
      dataList.value = orderedPageData;
    } else {
      dataList.value.push(...orderedPageData);
    }

    scrollbar.value?.handleScroll();
  };

  const loadPageData = async (pages: number[], replace: boolean, runner: PageLoadRunner = runLoad): Promise<void> => {
    if (pages.length === 0) {
      noMoreData.value = true;
      return;
    }

    const lastLoadedPage = pages[pages.length - 1] as number;
    const cachedPages = pages.filter((page) => pageCache.has(page));
    const missingPages = pages.filter((page) => !pageCache.has(page));

    if (missingPages.length === 0) {
      const direction = isReverse.value ? ReplyOrder.Desc : ReplyOrder.Asc;
      commitPageData({
        page: lastLoadedPage,
        data: cachedPages.map((page) => pageCache.get(page) || []),
        replace,
        direction,
      });
      return;
    }

    await runner(async (context) => {
      if (!replace && dataList.value.length > 0) {
        await nextTick();

        if (context.isCurrent()) {
          scrollToBottom();
        }
      }

      const pageData = await Promise.all(
        missingPages.map((page) => {
          return requestCallback(page, context.signal);
        }),
      );

      if (!context.isCurrent()) {
        return;
      }

      missingPages.forEach((page, index) => {
        const data = pageData[index];

        if (data) {
          pageCache.set(page, data);
        }
      });

      commitPageData({
        page: lastLoadedPage,
        data: pages.map((page) => pageCache.get(page) || []),
        replace,
        direction: context.direction,
      });
    });
  };

  const getFirstPageData = async (): Promise<void> => {
    const direction = isReverse.value ? ReplyOrder.Desc : ReplyOrder.Asc;
    await loadPageData(getPageNumbers(currentPage.value, direction), true);
  };

  const getNextPageData = async (): Promise<void> => {
    if (isLoading.value || errorOccurred.value || noMoreData.value) {
      return;
    }

    const nextPage = currentPage.value + (isReverse.value ? -1 : 1);

    if (nextPage < 1) {
      noMoreData.value = true;
      return;
    }

    await loadPageData(getPageNumbers(nextPage, isReverse.value ? ReplyOrder.Desc : ReplyOrder.Asc), false);
  };

  const startLoad = async (
    direction: ReplyOrder,
    startPage: number,
    options?: StartScrollLoadOptions<T>,
  ): Promise<void> => {
    startSession(direction);
    pageCache.clear();
    knownTotalPageNumber = options?.totalPageNumber;

    options?.pageSeeds?.forEach(({ page, data }) => {
      if (page > 0) {
        pageCache.set(page, data);
      }
    });

    dataList.value = [];
    currentPage.value = Math.max(startPage, 1);
    noMoreData.value = startPage < 1;

    if (startPage < 1) {
      return;
    }

    noMoreData.value =
      direction === ReplyOrder.Desc
        ? startPage <= 1
        : knownTotalPageNumber !== undefined && startPage >= knownTotalPageNumber;
    await getFirstPageData();
  };

  const startForwardLoad = async (pageSeeds: PageDataSeed<T[]>[] = [], totalPageNumber?: number): Promise<void> => {
    await startLoad(ReplyOrder.Asc, 1, {
      pageSeeds,
      totalPageNumber,
    });
  };

  /**
   * 倒序加载入口：从指定页（通常为最后一页）开始请求
   */
  const startReverseLoad = async (startPage: number, pageSeeds: PageDataSeed<T[]>[] = []): Promise<void> => {
    await startLoad(ReplyOrder.Desc, startPage, {
      pageSeeds,
      totalPageNumber: startPage,
    });
  };

  const reloadPageData = async (): Promise<void> => {
    if (isFirstPage.value) {
      const direction = isReverse.value ? ReplyOrder.Desc : ReplyOrder.Asc;
      await loadPageData(getPageNumbers(currentPage.value, direction), true, retryLoad);
      return;
    }

    const nextPage = currentPage.value + (isReverse.value ? -1 : 1);

    if (nextPage < 1) {
      noMoreData.value = true;
      return;
    }

    await loadPageData(getPageNumbers(nextPage, isReverse.value ? ReplyOrder.Desc : ReplyOrder.Asc), false, retryLoad);
  };

  const reloadFirstPageData = (firstPageData: T[], totalDataCount?: number) => {
    startSession();
    pageCache.clear();
    pageCache.set(1, firstPageData);
    knownTotalPageNumber = totalDataCount === undefined ? undefined : Math.ceil(Math.max(totalDataCount, 0) / pageSize);
    currentPage.value = 1;
    dataList.value = firstPageData;
    noMoreData.value =
      totalDataCount === undefined ? firstPageData.length < pageSize : firstPageData.length >= totalDataCount;
  };

  const updateCurrentPageData = (total: string, lastPageData: T[]) => {
    const lastPageNum = Math.ceil(Number(total) / pageSize);

    if (currentPage.value !== lastPageNum) {
      return;
    }

    noMoreData.value = lastPageData.length < pageSize;
    knownTotalPageNumber = lastPageNum;
    pageCache.set(lastPageNum, lastPageData);

    const currentPageStartIndex = (currentPage.value - 1) * pageSize;
    dataList.value = dataList.value.slice(0, currentPageStartIndex).concat(lastPageData);
  };

  const replaceLoadedData = (loadedPage: number, loadedData: T[], isComplete: boolean) => {
    startSession();
    pageCache.clear();
    knownTotalPageNumber = undefined;
    currentPage.value = Math.max(loadedPage, 1);
    dataList.value = loadedData;
    noMoreData.value = isComplete;
  };

  const setPageCount = (pageCount: number): void => {
    currentPageCount = Math.max(pageCount, 1);
  };

  const resetScrollLoadState = () => {
    resetSession();
    pageCache.clear();
    knownTotalPageNumber = undefined;
    dataList.value = [];
    currentPage.value = 1;
    noMoreData.value = true;
  };

  return {
    dataList,
    scrollbar,
    isFirstPage,
    isFirstPageLoading,
    isFirstPageEmpty,
    isNextPageLoading,
    disableInfiniteScroll,
    noMoreData: isNoMoreData,
    errorOccurred,
    getFirstPageData,
    getNextPageData,
    startForwardLoad,
    startReverseLoad,
    reloadPageData,
    reloadFirstPageData,
    updateCurrentPageData,
    replaceLoadedData,
    setPageCount,
    resetScrollLoadState,
    scrollToTop,
    scrollToBottom,
    scrollBy,
    scrollToElement,
  };
};
