import { browser } from 'wxt/browser';

import { createPermissionWindow, focusPermissionWindow } from '@/utils/permission-window';
import { hasPermission } from '@/utils/permissions';
import { DOWNLOAD_WINDOW_STATE_KEY, ExtensionMessageType, OptionalPermissionCapability } from '@/constants';

import type { DownloadWindowState } from '@/types';

let popupTask = Promise.resolve();

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

const getWindowState = async (): Promise<DownloadWindowState | undefined> => {
  const storage = await browser.storage.local.get(DOWNLOAD_WINDOW_STATE_KEY);
  return storage[DOWNLOAD_WINDOW_STATE_KEY] as DownloadWindowState | undefined;
};

const setWindowState = async (state: DownloadWindowState) => {
  await browser.storage.local.set({
    [DOWNLOAD_WINDOW_STATE_KEY]: state,
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

const openDownloadWindow = (imgUrl: string, downloadImmediately: boolean, sourceTabId?: number): Promise<void> => {
  const permissionPageBaseUrl = browser.runtime.getURL('/optional-permission.html');
  const permissionPageUrl = new URL(permissionPageBaseUrl);
  permissionPageUrl.searchParams.set('capability', OptionalPermissionCapability.DownloadImage);
  permissionPageUrl.searchParams.set('imgUrl', imgUrl);

  if (downloadImmediately) {
    permissionPageUrl.searchParams.set('download', 'true');
  }

  const task = popupTask.then(async () => {
    const currentState = await getWindowState();
    const nextState: DownloadWindowState = {
      windowId: currentState?.windowId,
      sourceTabId: sourceTabId ?? currentState?.sourceTabId,
      imgUrl,
      downloadImmediately,
    };

    await setWindowState(nextState);

    if (await focusPermissionWindow(currentState?.windowId)) {
      return;
    }

    const windowId = await createPermissionWindow(permissionPageUrl.href);
    await setWindowState({
      ...nextState,
      windowId,
    });
  });

  popupTask = task.catch(() => {
    return;
  });

  return task;
};

export const downloadImg = async (imgUrl?: string, sourceTabId?: number): Promise<void> => {
  if (!isDownloadableUrl(imgUrl)) {
    return;
  }

  const granted = await hasPermission(OptionalPermissionCapability.DownloadImage);

  if (granted && browser.downloads) {
    await browser.downloads.download({
      url: imgUrl,
    });
    await notifyImgDownloadSuccess(sourceTabId);
    return;
  }

  await openDownloadWindow(imgUrl, granted, sourceTabId);
};

export const clearDownloadWindowState = async (windowId: number): Promise<void> => {
  const state = await getWindowState();

  if (state?.windowId === windowId) {
    await browser.storage.local.remove(DOWNLOAD_WINDOW_STATE_KEY);
  }
};
