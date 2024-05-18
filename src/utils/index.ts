import { createApp } from 'vue';
import { ElMessage } from 'element-plus';
import Cookies from 'js-cookie';
import { cloneDeep, merge } from 'lodash-es';
import { storage } from 'webextension-polyfill';

import i18n, { t } from '@/i18n';
import { API_TOPIC, API_USER } from '@/api';
import { defaultExtensionStorage, GZK_URL, topicLinkRegExp } from '@/constants';
import {
  ALREADY_LIKE,
  CAN_NOT_FAVORITE_YOUR_TOPIC,
  CAN_NOT_LIKE_YOUR_REPLY,
  CAN_NOT_LIKE_YOUR_TOPIC,
  SUCCESS_LIKE,
  USER_NOT_LOGIN,
} from '@/constants/res-msg';
import { SELECTOR_LOGIN_USER_LINK, SELECTOR_TOPIC_LINK } from '@/constants/selector';

import type { ApiJsonResponse, Base64File, ScriptAppOptions, StorageSettings, UserReplyItem } from '@/types';

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

export const translateNavigation = (title?: string) => {
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

export const request = async (url: string, init?: RequestInit): Promise<string> => {
  const res = await fetch(GZK_URL + url, init);

  if (!res.ok || res.status !== 200) {
    throw new Error(res.statusText);
  }

  if (res.redirected && res.url.includes('/login')) {
    throw new Error(t('common.plzLogin'));
  }

  const data = await res.text();

  if (!data) {
    throw new Error(t('common.emptyData'));
  }

  // 若 JSON.parse(data) 未报错，代表返回的数据是 JSON 格式的字符串，否则为 HTML 字符串
  try {
    const { message, success } = JSON.parse(data) as ApiJsonResponse;

    if (!success) {
      ElMessage.error(getResMessage(message));
    }

    return message;
  } catch {
    return data;
  }
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

export const getXsrfToken = () => {
  return Cookies.get('_xsrf') || '';
};

export const getTopicUrl = (topicId?: string) => {
  return `${GZK_URL}${API_TOPIC}${topicId}`;
};

export const handleReplyLike = (replyItem: UserReplyItem, msg: string) => {
  if (msg === SUCCESS_LIKE || msg === ALREADY_LIKE) {
    replyItem.liked = true;
  }

  if (msg === SUCCESS_LIKE) {
    replyItem.likeNumber = String(Number(replyItem.likeNumber) + 1);
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const base64ToFile = (file: Base64File): File => {
  const byteCharacters = atob(file.base64Str);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new File([byteArray], file.name, { type: file.type });
};

export const checkMacOS = () => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

export const blockTopics = (topicIds: string[]) => {
  if (!topicIds.length) {
    return;
  }

  const topicElements = [
    ...document.querySelectorAll<HTMLElement>('.topic-item'),
    ...document.querySelectorAll<HTMLElement>('.hot-topics .cell'),
  ];

  topicElements.forEach((element) => {
    const topicLinkElement = element.querySelector<HTMLAnchorElement>(SELECTOR_TOPIC_LINK);

    if (!topicLinkElement) {
      return;
    }

    const topicId = topicLinkElement.href.match(topicLinkRegExp)?.[1];

    if (topicIds.includes(topicId as string)) {
      element.style.display = 'none';
    }
  });
};
