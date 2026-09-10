import localforage from 'localforage';

import type { BiliImgHistoryItem } from '@/types';

const biliImgStore = localforage.createInstance({
  name: 'biliImg',
  storeName: 'imgHistory',
});

export const addImgHistory = async (data: BiliImgHistoryItem) => {
  await biliImgStore.setItem(data.id, data);
};

export const deleteImgHistory = async (ids: string[]) => {
  for (const id of ids) {
    await biliImgStore.removeItem(id);
  }
};

export const clearImgHistory = async () => {
  await biliImgStore.clear();
};

export const getAllImgHistory = async () => {
  const imgHistoryItems: BiliImgHistoryItem[] = [];

  await biliImgStore.iterate<BiliImgHistoryItem, unknown>((value) => {
    imgHistoryItems.push(value);
  });

  return imgHistoryItems.sort((prev, next) => next.date - prev.date);
};

export const replaceAllImgHistory = async (items: BiliImgHistoryItem[]): Promise<void> => {
  await biliImgStore.clear();

  for (const item of items) {
    await biliImgStore.setItem(item.id, item);
  }
};
