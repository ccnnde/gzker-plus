import { nanoid } from 'nanoid';
import { browser } from 'wxt/browser';

import { uploadImg } from '@/api/sm-img';
import { base64ToFile, initStorage, sendMessageToTab, waitTime } from '@/utils';
import { addImgHistory } from '@/utils/bili-img-store';
import {
  DOWNLOAD_PERMISSION_WINDOW_STATE_KEY,
  ExtensionMessageType,
  GZK_URL,
  GZK_URL_PATTERN,
  GzkCtxMenuIds,
  OptionsRouteNames,
  OptionsRoutePaths,
} from '@/constants';

import type { Browser } from 'wxt/browser';
import type { Base64File, BiliUploadedImg, DownloadPermissionWindowState, ExtensionMessage } from '@/types';

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

const openDownloadPermissionPage = (imgUrl: string, downloadImmediately: boolean): Promise<void> => {
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

const downloadImg = async (imgUrl?: string) => {
  if (!isDownloadableUrl(imgUrl)) {
    return;
  }

  const hasPermission = await browser.permissions.contains(DOWNLOAD_PERMISSION);

  if (hasPermission && browser.downloads) {
    return await browser.downloads.download({
      url: imgUrl,
    });
  }

  await openDownloadPermissionPage(imgUrl, hasPermission);
};

const openOptionsPage = async (path?: string) => {
  let optionsPageUrl = browser.runtime.getURL('/options.html');

  const [tab] = await browser.tabs.query({
    url: optionsPageUrl,
  });

  optionsPageUrl += `#${path || OptionsRoutePaths[OptionsRouteNames.BasicSetting]}`;

  if (tab) {
    browser.tabs.update(tab.id, {
      url: optionsPageUrl,
      active: true,
    });
  } else {
    browser.tabs.create({
      url: optionsPageUrl,
    });
  }
};

export const setupBackground = () => {
  browser.windows.onRemoved.addListener(async (windowId) => {
    const state = await getDownloadPermissionWindowState();

    if (state?.windowId === windowId) {
      await browser.storage.local.remove(DOWNLOAD_PERMISSION_WINDOW_STATE_KEY);
    }
  });

  browser.runtime.onInstalled.addListener(async (details) => {
    const { reason } = details;

    await initStorage();

    if (reason === 'install') {
      openOptionsPage();
    } else if (reason === 'update') {
      openOptionsPage(OptionsRoutePaths[OptionsRouteNames.ChangeLog]);
    }
  });

  browser.runtime.onMessage.addListener(async (message: ExtensionMessage) => {
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
        return await downloadImg(message.imgUrl);
      case ExtensionMessageType.CloseBiliImgTab:
        if (biliImgTab) {
          await browser.tabs.remove(biliImgTab.id as number);
        }

        biliImgTab = undefined;
        isBiliImgTabOpened = false;

        return;
    }
  });

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

        if (tab?.id && tab?.url?.includes(GZK_URL)) {
          browser.tabs.sendMessage(tab.id, {
            msgType: ExtensionMessageType.BlockKeyword,
            keyword: '',
          });
        }

        break;
      }
    }
  });
};
