import { browser } from 'wxt/browser';

import { createPermissionWindow, focusPermissionWindow } from '@/utils/permission-window';
import { hasPermission } from '@/utils/permissions';
import { ExtensionMessageType } from '@/constants';

import type { ExtensionMessage, UploadPermissionCapability, UploadWindowState } from '@/types';

const STATE_KEY_PREFIX = 'optionalPermissionWindow:';

const getStateKey = (windowId: number): string => {
  return `${STATE_KEY_PREFIX}${windowId}`;
};

export const focusUploadWindow = async (sourceTabId: number, requestId: string): Promise<void> => {
  const storage = await browser.storage.local.get(null);

  for (const [key, value] of Object.entries(storage)) {
    if (!key.startsWith(STATE_KEY_PREFIX)) {
      continue;
    }

    const state = value as UploadWindowState;

    if (state.sourceTabId !== sourceTabId || state.requestId !== requestId) {
      continue;
    }

    const windowId = Number(key.slice(STATE_KEY_PREFIX.length));
    await focusPermissionWindow(windowId);
    return;
  }
};

export const openUploadWindow = async (
  capability: UploadPermissionCapability,
  sourceTabId: number,
  requestId: string,
): Promise<void> => {
  const permissionPageUrl = new URL(browser.runtime.getURL('/optional-permission.html'));
  permissionPageUrl.searchParams.set('capability', capability);

  const windowId = await createPermissionWindow(permissionPageUrl.href);
  const key = getStateKey(windowId);

  try {
    await browser.storage.local.set({
      [key]: {
        sourceTabId,
        requestId,
        capability,
      } satisfies UploadWindowState,
    });
  } catch (error) {
    await browser.windows.remove(windowId);
    throw error;
  }
};

export const resolveUploadPermission = async (windowId: number): Promise<void> => {
  const key = getStateKey(windowId);
  const storage = await browser.storage.local.get(key);
  const state = storage[key] as UploadWindowState | undefined;

  if (!state) {
    return;
  }

  await browser.storage.local.remove(key);

  let granted = false;

  try {
    granted = await hasPermission(state.capability);
  } catch (error) {
    console.error(error);
  }

  try {
    await browser.tabs.sendMessage(state.sourceTabId, {
      msgType: ExtensionMessageType.UploadPermissionResolved,
      permissionRequestId: state.requestId,
      permissionGranted: granted,
    } satisfies ExtensionMessage);
  } catch {
    // 来源标签页可能已关闭
  }
};
