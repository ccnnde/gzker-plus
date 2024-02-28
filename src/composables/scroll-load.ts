import { computed, nextTick, ref, watch } from 'vue';

import { useRequest } from './request';
import { useScrollbar } from './scrollbar';

import type { Ref } from 'vue';

export const useScrollLoad = <T>(pageSize: number, requestCallback: (page: number) => Promise<T[]>) => {
  const { isLoading, errorOccurred, handleRequest, resetRequestState } = useRequest();
  const { scrollbar, scrollToTop, scrollToBottom } = useScrollbar();
  const dataList = ref<T[]>([]) as Ref<T[]>;
  const currentPage = ref(1);
  const noMoreData = ref(true);

  const isFirstPage = computed(() => {
    return currentPage.value === 1;
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

  watch(isNextPageLoading, async () => {
    if (!isNextPageLoading.value) {
      return;
    }

    await nextTick();
    scrollToBottom();
  });

  const getFirstPageData = () => {
    handleRequest(async () => {
      const firstPageData = await requestCallback(currentPage.value);
      dataList.value = firstPageData;
      noMoreData.value = firstPageData.length < pageSize;
    });
  };

  const getNextPageData = () => {
    currentPage.value++;

    handleRequest(async () => {
      const nextPageData = await requestCallback(currentPage.value);
      const nextPageNumber = nextPageData.length;

      if (nextPageNumber === 0) {
        currentPage.value--;
      }

      noMoreData.value = nextPageNumber < pageSize;
      dataList.value.push(...nextPageData);
    });
  };

  const reloadPageData = () => {
    errorOccurred.value = false;

    if (isFirstPage.value) {
      getFirstPageData();
      return;
    }

    currentPage.value--;
    getNextPageData();
  };

  const reloadFirstPageData = (firstPageData: T[]) => {
    currentPage.value = 1;
    dataList.value = firstPageData;
    noMoreData.value = firstPageData.length < pageSize;
  };

  const updateCurrentPageData = (total: string, lastPageData: T[]) => {
    const lastPageNum = Math.ceil(Number(total) / pageSize);

    if (currentPage.value !== lastPageNum) {
      return;
    }

    noMoreData.value = lastPageData.length < pageSize;

    const currentPageStartIndex = (currentPage.value - 1) * pageSize;
    dataList.value = dataList.value.slice(0, currentPageStartIndex).concat(lastPageData);
  };

  const resetScrollLoadState = () => {
    dataList.value = [];
    currentPage.value = 1;
    noMoreData.value = true;
    resetRequestState();
  };

  return {
    dataList,
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
  };
};
