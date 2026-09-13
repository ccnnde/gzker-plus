import { nanoid } from 'nanoid';
import { browser } from 'wxt/browser';

import { uploadImg } from '@/api/sm-img';
import { base64ToFile, initStorage, sendMessageToTab } from '@/utils';
import { addImgHistory } from '@/utils/bili-img-store';
import { hasPermission } from '@/utils/optional-permission';
import {
  focusPermissionWindow,
  getPermissionWindowPosition,
  PERMISSION_WINDOW_HEIGHT,
  PERMISSION_WINDOW_WIDTH,
} from '@/utils/permission-window';
import {
  BILI_IMAGE_PAGE_ORIGIN,
  BILI_IMAGE_UPLOAD_PATH,
  DOWNLOAD_PERMISSION_WINDOW_STATE_KEY,
  ExtensionMessageType,
  GZK_URL_PATTERN,
  GzkCtxMenuIds,
  OPTIONS_PAGE_TAB_STATE_KEY,
  OptionsRouteNames,
  OptionsRoutePaths,
} from '@/constants';

import {
  focusOptionalPermissionPage,
  handleOptionalPermissionWindowRemoved,
  openOptionalPermissionPage,
} from './optional-permission';

import type { Browser } from 'wxt/browser';
import type {
  Base64File,
  BiliUploadedImg,
  DownloadPermissionWindowState,
  ExtensionMessage,
  OptionsPageTabState,
} from '@/types';

const BILI_IMG_TAB_URL = `${BILI_IMAGE_PAGE_ORIGIN}${BILI_IMAGE_UPLOAD_PATH}`;
const BILI_IMG_SCRIPT_PATH = '/content-scripts/upload-bili-img.js';
const DOWNLOAD_PERMISSION: Browser.permissions.Permissions = {
  permissions: ['downloads'],
};
let biliImgTab: Browser.tabs.Tab | undefined;
let biliImgTabTask: Promise<Browser.tabs.Tab> | undefined;
let downloadPermissionWindowTask = Promise.resolve();

const isBiliImgUploadPage = (url?: string): boolean => {
  if (!url) {
    return false;
  }

  try {
    const pageUrl = new URL(url);
    return pageUrl.origin === BILI_IMAGE_PAGE_ORIGIN && pageUrl.pathname === BILI_IMAGE_UPLOAD_PATH;
  } catch {
    return false;
  }
};

const waitForBiliImgTab = (tabId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('BiliBili image upload page timed out'));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeout);
      browser.tabs.onUpdated.removeListener(handleUpdated);
      browser.tabs.onRemoved.removeListener(handleRemoved);
    };

    const handleUpdated = (updatedTabId: number, changeInfo: Browser.tabs.OnUpdatedInfo, tab: Browser.tabs.Tab) => {
      if (updatedTabId !== tabId) {
        return;
      }

      if (isBiliImgUploadPage(tab.url)) {
        cleanup();
        resolve();
        return;
      }

      if (changeInfo.status === 'complete' && tab.url !== 'about:blank') {
        cleanup();
        reject(new Error('BiliBili image upload page did not open'));
      }
    };

    const handleRemoved = (removedTabId: number) => {
      if (removedTabId === tabId) {
        cleanup();
        reject(new Error('BiliBili image upload page was closed'));
      }
    };

    browser.tabs.onUpdated.addListener(handleUpdated);
    browser.tabs.onRemoved.addListener(handleRemoved);

    browser.tabs.get(tabId).then(
      (tab) => {
        if (isBiliImgUploadPage(tab.url)) {
          cleanup();
          resolve();
        } else if (tab.status === 'complete' && tab.url !== 'about:blank') {
          cleanup();
          reject(new Error('BiliBili image upload page did not open'));
        }
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
};

const createBiliImgTab = async (): Promise<Browser.tabs.Tab> => {
  const tab = await browser.tabs.create({
    url: BILI_IMG_TAB_URL,
    active: false,
  });

  if (tab.id === undefined) {
    throw new Error('BiliBili image upload tab has no ID');
  }

  biliImgTab = tab;
  await waitForBiliImgTab(tab.id);

  if (import.meta.env.FIREFOX) {
    await browser.tabs.executeScript(tab.id, { file: BILI_IMG_SCRIPT_PATH });
  } else {
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: [BILI_IMG_SCRIPT_PATH],
    });
  }

  return tab;
};

const isDownloadableUrl = (value?: string): value is string => {
  if (!value) {
    return false;
  }

  try {
    const { protocol } = new URL(value);
    return ['blob:', 'data:', 'http:', 'https:'].includes(protocol);
  } catch {
    return false;
  }
};

const getDownloadPermissionWindowState = async (): Promise<DownloadPermissionWindowState | undefined> => {
  const storage = await browser.storage.local.get(DOWNLOAD_PERMISSION_WINDOW_STATE_KEY);
  return storage[DOWNLOAD_PERMISSION_WINDOW_STATE_KEY] as DownloadPermissionWindowState | undefined;
};

const setDownloadPermissionWindowState = async (state: DownloadPermissionWindowState) => {
  await browser.storage.local.set({
    [DOWNLOAD_PERMISSION_WINDOW_STATE_KEY]: state,
  });
};

const notifyImgDownloadSuccess = async (tabId?: number) => {
  if (tabId === undefined) {
    return;
  }

  try {
    await browser.tabs.sendMessage(tabId, {
      msgType: ExtensionMessageType.DownloadImgSuccess,
    });
  } catch {
    return;
  }
};

const openDownloadPermissionPage = (
  imgUrl: string,
  downloadImmediately: boolean,
  sourceTabId?: number,
): Promise<void> => {
  const permissionPageBaseUrl = browser.runtime.getURL('/download-permission.html');
  const permissionPageUrl = new URL(permissionPageBaseUrl);
  permissionPageUrl.searchParams.set('imgUrl', imgUrl);

  if (downloadImmediately) {
    permissionPageUrl.searchParams.set('download', 'true');
  }

  const task = downloadPermissionWindowTask.then(async () => {
    const currentState = await getDownloadPermissionWindowState();
    const nextState: DownloadPermissionWindowState = {
      windowId: currentState?.windowId,
      sourceTabId: sourceTabId ?? currentState?.sourceTabId,
      imgUrl,
      downloadImmediately,
    };

    await setDownloadPermissionWindowState(nextState);

    if (await focusPermissionWindow(currentState?.windowId)) {
      return;
    }

    const { left, top } = await getPermissionWindowPosition();

    const permissionWindow = await browser.windows.create({
      url: permissionPageUrl.href,
      type: 'popup',
      left,
      top,
      width: PERMISSION_WINDOW_WIDTH,
      height: PERMISSION_WINDOW_HEIGHT,
    });

    if (permissionWindow?.id !== undefined) {
      await setDownloadPermissionWindowState({
        ...nextState,
        windowId: permissionWindow.id,
      });
    }
  });

  downloadPermissionWindowTask = task.catch(() => {
    return;
  });

  return task;
};

const downloadImg = async (imgUrl?: string, sourceTabId?: number) => {
  if (!isDownloadableUrl(imgUrl)) {
    return;
  }

  const hasDownloadPermission = await browser.permissions.contains(DOWNLOAD_PERMISSION);

  if (hasDownloadPermission && browser.downloads) {
    await browser.downloads.download({
      url: imgUrl,
    });
    await notifyImgDownloadSuccess(sourceTabId);
    return;
  }

  await openDownloadPermissionPage(imgUrl, hasDownloadPermission, sourceTabId);
};

const getOptionsPageTabState = async (): Promise<OptionsPageTabState | undefined> => {
  const storage = await browser.storage.session.get(OPTIONS_PAGE_TAB_STATE_KEY);
  return storage[OPTIONS_PAGE_TAB_STATE_KEY] as OptionsPageTabState | undefined;
};

const setOptionsPageTabState = async (tabId: number) => {
  await browser.storage.session.set({
    [OPTIONS_PAGE_TAB_STATE_KEY]: {
      tabId,
    } satisfies OptionsPageTabState,
  });
};

const focusOptionsPage = async (tabId: number, url: string): Promise<boolean> => {
  try {
    const tab = await browser.tabs.update(tabId, {
      url,
      active: true,
    });

    if (!tab) {
      throw new Error('Failed to update options page tab');
    }

    await browser.windows.update(tab.windowId, {
      focused: true,
    });
    return true;
  } catch {
    await browser.storage.session.remove(OPTIONS_PAGE_TAB_STATE_KEY);
    return false;
  }
};

const openOptionsPage = async (path?: string) => {
  const optionsPageUrl = `${browser.runtime.getURL('/options.html')}#${
    path || OptionsRoutePaths[OptionsRouteNames.BasicSetting]
  }`;
  const state = await getOptionsPageTabState();

  if (state && (await focusOptionsPage(state.tabId, optionsPageUrl))) {
    return;
  }

  const tab = await browser.tabs.create({
    url: optionsPageUrl,
  });

  if (tab.id !== undefined) {
    await setOptionsPageTabState(tab.id);
  }
};

const setupContextMenus = async () => {
  await browser.contextMenus.removeAll();

  browser.contextMenus.create({
    id: GzkCtxMenuIds.Root,
    title: '过早客 Plus',
    contexts: ['all'],
    documentUrlPatterns: [GZK_URL_PATTERN],
  });

  browser.contextMenus.create({
    id: GzkCtxMenuIds.OpenExtOptions,
    parentId: GzkCtxMenuIds.Root,
    title: '过早客 Plus 设置',
    contexts: ['all'],
    documentUrlPatterns: [GZK_URL_PATTERN],
  });

  browser.contextMenus.create({
    id: GzkCtxMenuIds.BlockKeyword,
    parentId: GzkCtxMenuIds.Root,
    title: '屏蔽包含"%s"的主题',
    contexts: ['selection'],
    documentUrlPatterns: [GZK_URL_PATTERN],
  });

  browser.contextMenus.create({
    id: GzkCtxMenuIds.Base64Decode,
    parentId: GzkCtxMenuIds.Root,
    title: 'Base64 解码 "%s"',
    contexts: ['selection'],
    documentUrlPatterns: [GZK_URL_PATTERN],
  });
};

export const setupBackground = () => {
  browser.tabs.onRemoved.addListener(async (tabId) => {
    const state = await getOptionsPageTabState();

    if (state?.tabId === tabId) {
      await browser.storage.session.remove(OPTIONS_PAGE_TAB_STATE_KEY);
    }
  });

  browser.windows.onRemoved.addListener(async (windowId) => {
    const state = await getDownloadPermissionWindowState();

    if (state?.windowId === windowId) {
      await browser.storage.local.remove(DOWNLOAD_PERMISSION_WINDOW_STATE_KEY);
    }
  });

  browser.windows.onRemoved.addListener(handleOptionalPermissionWindowRemoved);

  browser.runtime.onInstalled.addListener(async (details) => {
    const { reason } = details;

    await setupContextMenus();
    await initStorage();

    if (reason === 'install') {
      openOptionsPage();
    } else if (reason === 'update') {
      openOptionsPage(OptionsRoutePaths[OptionsRouteNames.ChangeLog]);
    }
  });

  browser.runtime.onMessage.addListener(async (message: ExtensionMessage, sender) => {
    switch (message.msgType) {
      case ExtensionMessageType.OpenOptionsPage:
        openOptionsPage(message.extPagePath);
        return;
      case ExtensionMessageType.CheckOptionalPermission:
        if (!message.permissionCapability) {
          throw new Error('Missing optional permission capability');
        }

        return await hasPermission(message.permissionCapability);
      case ExtensionMessageType.OpenOptionalPermissionPage:
        if (
          sender.tab?.id === undefined ||
          message.permissionRequestId === undefined ||
          message.permissionCapability === undefined
        ) {
          throw new Error('Missing optional permission request context');
        }

        await openOptionalPermissionPage(message.permissionCapability, sender.tab.id, message.permissionRequestId);
        return;
      case ExtensionMessageType.FocusOptionalPermissionPage:
        if (sender.tab?.id === undefined || message.permissionRequestId === undefined) {
          throw new Error('Missing optional permission request context');
        }

        await focusOptionalPermissionPage(sender.tab.id, message.permissionRequestId);
        return;
      case ExtensionMessageType.UploadImg: {
        const imgFile = base64ToFile(message.imgFile as Base64File);
        return await uploadImg(message.apiKey as string, imgFile);
      }
      case ExtensionMessageType.UploadBiliImg: {
        biliImgTabTask ??= createBiliImgTab();
        const tab = await biliImgTabTask;
        const imgData: BiliUploadedImg = await sendMessageToTab(tab.id, message);

        await addImgHistory({
          id: nanoid(),
          name: message.imgFile?.name as string,
          url: imgData.location,
          width: imgData.image_width,
          height: imgData.image_height,
          size: imgData.img_size,
          date: Date.now(),
        });

        return imgData.location;
      }
      case ExtensionMessageType.DownloadImg:
        return await downloadImg(message.imgUrl, sender.tab?.id);
      case ExtensionMessageType.CloseBiliImgTab:
        if (biliImgTab?.id !== undefined) {
          try {
            await browser.tabs.remove(biliImgTab.id);
          } catch {
            // 上传标签页可能已被用户关闭
          }
        }

        biliImgTab = undefined;
        biliImgTabTask = undefined;

        return;
    }
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    switch (info.menuItemId) {
      case GzkCtxMenuIds.OpenExtOptions:
        openOptionsPage();
        break;
      case GzkCtxMenuIds.BlockKeyword: {
        if (tab?.id) {
          browser.tabs.sendMessage(tab.id, {
            msgType: ExtensionMessageType.BlockKeyword,
            keyword: info.selectionText?.trim(),
          });
        }

        break;
      }
      case GzkCtxMenuIds.Base64Decode: {
        const selectedText = info.selectionText?.trim();

        if (selectedText) {
          try {
            const binaryStr = atob(selectedText);
            const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
            const decoded = new TextDecoder().decode(bytes);

            if (tab?.id) {
              browser.tabs.sendMessage(tab.id, {
                msgType: ExtensionMessageType.Base64Decode,
                decodedText: decoded,
              });
            }
          } catch (err) {
            if (tab?.id) {
              browser.tabs.sendMessage(tab.id, {
                msgType: ExtensionMessageType.Base64Decode,
                decodedError: true,
              });
            }

            console.error(err);
          }
        }

        break;
      }
    }
  });

  browser.commands.onCommand.addListener(async (command) => {
    switch (command) {
      case GzkCtxMenuIds.BlockKeyword: {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (tab?.id !== undefined) {
          try {
            await browser.tabs.sendMessage(tab.id, {
              msgType: ExtensionMessageType.BlockKeyword,
              keyword: '',
            });
          } catch {
            return;
          }
        }

        break;
      }
    }
  });
};
