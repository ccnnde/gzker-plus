import { nanoid } from 'nanoid';
import { browser } from 'wxt/browser';

import { uploadImg } from '@/api/sm-img';
import { base64ToFile, initStorage, sendMessageToTab, waitTime } from '@/utils';
import { addImgHistory } from '@/utils/bili-img-store';
import {
  DOWNLOAD_PERMISSION_WINDOW_STATE_KEY,
  ExtensionMessageType,
  GZK_URL_PATTERN,
  GzkCtxMenuIds,
  OPTIONS_PAGE_TAB_STATE_KEY,
  OptionsRouteNames,
  OptionsRoutePaths,
} from '@/constants';

import type { Browser } from 'wxt/browser';
import type {
  Base64File,
  BiliUploadedImg,
  DownloadPermissionWindowState,
  ExtensionMessage,
  OptionsPageTabState,
} from '@/types';

const BILI_IMG_TAB_URL = 'https://www.bilibili.com/gzk-img-upload';
const DOWNLOAD_PERMISSION_WINDOW_HEIGHT = 400;
const DOWNLOAD_PERMISSION_WINDOW_WIDTH = 520;
const DOWNLOAD_PERMISSION: Browser.permissions.Permissions = {
  permissions: ['downloads'],
};
let biliImgTab: Browser.tabs.Tab | undefined;
let isBiliImgTabOpened = false;
let downloadPermissionWindowTask = Promise.resolve();

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

const focusDownloadPermissionWindow = async (windowId?: number): Promise<boolean> => {
  if (windowId === undefined) {
    return false;
  }

  try {
    await browser.windows.get(windowId);
    await browser.windows.update(windowId, {
      focused: true,
    });
    return true;
  } catch {
    return false;
  }
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

    if (await focusDownloadPermissionWindow(currentState?.windowId)) {
      return;
    }

    const currentWindow = await browser.windows.getLastFocused();
    const left =
      currentWindow.left !== undefined && currentWindow.width !== undefined
        ? Math.round(currentWindow.left + (currentWindow.width - DOWNLOAD_PERMISSION_WINDOW_WIDTH) / 2)
        : undefined;
    const top =
      currentWindow.top !== undefined && currentWindow.height !== undefined
        ? Math.round(currentWindow.top + (currentWindow.height - DOWNLOAD_PERMISSION_WINDOW_HEIGHT) / 2)
        : undefined;

    const permissionWindow = await browser.windows.create({
      url: permissionPageUrl.href,
      type: 'popup',
      left,
      top,
      width: DOWNLOAD_PERMISSION_WINDOW_WIDTH,
      height: DOWNLOAD_PERMISSION_WINDOW_HEIGHT,
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

  const hasPermission = await browser.permissions.contains(DOWNLOAD_PERMISSION);

  if (hasPermission && browser.downloads) {
    await browser.downloads.download({
      url: imgUrl,
    });
    await notifyImgDownloadSuccess(sourceTabId);
    return;
  }

  await openDownloadPermissionPage(imgUrl, hasPermission, sourceTabId);
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
      case ExtensionMessageType.UploadImg: {
        const imgFile = base64ToFile(message.imgFile as Base64File);
        return await uploadImg(message.apiKey as string, imgFile);
      }
      case ExtensionMessageType.UploadBiliImg: {
        if (isBiliImgTabOpened) {
          await waitTime(200);
        } else {
          isBiliImgTabOpened = true;

          biliImgTab = await browser.tabs.create({
            url: BILI_IMG_TAB_URL,
            active: false,
          });
        }

        const imgData: BiliUploadedImg = await sendMessageToTab(biliImgTab?.id, message);

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
        if (biliImgTab) {
          await browser.tabs.remove(biliImgTab.id as number);
        }

        biliImgTab = undefined;
        isBiliImgTabOpened = false;

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
