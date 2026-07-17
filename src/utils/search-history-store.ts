import localforage from 'localforage';

import type { SearchHistoryItem } from '@/types';

const searchHistoryStore = localforage.createInstance({
  name: 'searchHistory',
  storeName: 'searchKeywords',
});

export const addSearchHistory = async (data: SearchHistoryItem) => {
  await searchHistoryStore.setItem(data.id, data);
};

export const deleteSearchHistory = async (id: string) => {
  await searchHistoryStore.removeItem(id);
};

export const clearSearchHistory = async () => {
  await searchHistoryStore.clear();
};

export const getAllSearchHistory = async () => {
  const historyItems: SearchHistoryItem[] = [];

  await searchHistoryStore.iterate<SearchHistoryItem, unknown>((value) => {
    historyItems.push(value);
  });

  return historyItems.sort((prev, next) => {
    return next.timestamp - prev.timestamp;
  });
};
