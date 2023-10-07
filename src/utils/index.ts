import { createApp } from 'vue';
import { ElMessage } from 'element-plus';
import { cloneDeep, merge } from 'lodash-es';
import { storage } from 'webextension-polyfill';

import i18n, { t } from '@/i18n';
import { API_USER } from '@/api';
import { defaultExtensionStorage } from '@/constants';
import {
  ALREADY_LIKE,
  CAN_NOT_FAVORITE_YOUR_TOPIC,
  CAN_NOT_LIKE_YOUR_REPLY,
  CAN_NOT_LIKE_YOUR_TOPIC,
  USER_NOT_LOGIN,
} from '@/constants/res-msg';
import { SELECTOR_LOGIN_USER_LINK } from '@/constants/selector';

import type { ApiJsonResponse, ScriptAppOptions, StorageSettings } from '@/types';

const getResMessage = (msg: string): string => {
  switch (msg) {
    case USER_NOT_LOGIN:
      return t('common.plzLogin');
    case ALREADY_LIKE:
      return t('resMessage.alreadyLiked');
    case CAN_NOT_FAVORITE_YOUR_TOPIC:
      return t('resMessage.canNotFavoriteYourTopic');
    case CAN_NOT_LIKE_YOUR_TOPIC:
      return t('resMessage.canNotLikeYourTopic');
    case CAN_NOT_LIKE_YOUR_REPLY:
      return t('resMessage.canNotLikeYourReply');
    default:
      return msg;
  }
};

export const createScriptApp = (options: ScriptAppOptions) => {
  const { root, pinia, containerId, containerParentNode } = options;
  const app = createApp(root);
  const container = document.createElement('div');

  container.id = containerId;
  containerParentNode?.appendChild(container);

  app.use(pinia);
  app.use(i18n);

  app.mount(container);
};

export const translateNavigation = (title: string | undefined) => {
  return title ? t('navigation.' + title) : '';
};

export const initStorage = async () => {
  const currentSettings = await getStorage();
  const fullSettings = cloneDeep(defaultExtensionStorage);

  merge(fullSettings, currentSettings);
  await setStorage(fullSettings);
};

export const setStorage = async (settings: Partial<StorageSettings>) => {
  await storage.sync.set(settings);
};

export const getStorage = async (): Promise<StorageSettings> => {
  const settings = await storage.sync.get();
  return settings as StorageSettings;
};

export const request = async (url: string): Promise<string> => {
  const res = await fetch(url);

  if (!res.ok || res.status !== 200) {
    throw new Error(res.statusText);
  }

  if (res.redirected && res.url.includes('/login')) {
    throw new Error(t('common.plzLogin'));
  }

  const data = await res.text();

  // 响应头部含有 Content-Length 字段时，代表返回的数据是 JSON 格式的字符串
  if (res.headers.has('Content-Length')) {
    const { message, success } = JSON.parse(data) as ApiJsonResponse;

    if (!success) {
      ElMessage.error(getResMessage(message));
    }

    return message;
  }

  return data;
};

export const addUnit = (val: number, unit: string = 'px'): string => {
  return val + unit;
};

export const waitTime = async (time: number = 100) => {
  await new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

export const getLoginUserId = () => {
  const loginUserLinkEle = document.querySelector(SELECTOR_LOGIN_USER_LINK) as HTMLAnchorElement | null;
  const loginUserId = loginUserLinkEle?.href.split(API_USER)[1];
  return loginUserId;
};
