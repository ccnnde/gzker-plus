import { browser } from 'wxt/browser';

import { getPermissionDefinition, hasPermission } from '@/utils/optional-permission';
import {
  focusPermissionWindow,
  getPermissionWindowPosition,
  PERMISSION_WINDOW_HEIGHT,
  PERMISSION_WINDOW_WIDTH,
} from '@/utils/permission-window';
import { ExtensionMessageType } from '@/constants';

import type { OptionalPermissionCapability } from '@/constants';
import type { ExtensionMessage, OptionalPermissionWindowState } from '@/types';

const STATE_KEY_PREFIX = 'optionalPermissionWindow:';

const getStateKey = (windowId: number): string => {
  return `${STATE_KEY_PREFIX}${windowId}`;
};

export const focusOptionalPermissionPage = async (sourceTabId: number, requestId: string): Promise<void> => {
  const storage = await browser.storage.local.get(null);

  for (const [key, value] of Object.entries(storage)) {
    if (!key.startsWith(STATE_KEY_PREFIX)) {
      continue;
    }

    const state = value as OptionalPermissionWindowState;

    if (state.sourceTabId !== sourceTabId || state.requestId !== requestId) {
      continue;
    }

    const windowId = Number(key.slice(STATE_KEY_PREFIX.length));
    await focusPermissionWindow(windowId);
    return;
  }
};

export const openOptionalPermissionPage = async (
  capability: OptionalPermissionCapability,
  sourceTabId: number,
  requestId: string,
): Promise<void> => {
  if (!getPermissionDefinition(capability)) {
    throw new Error(`Unknown optional permission capability: ${capability}`);
  }

  const permissionPageUrl = new URL(browser.runtime.getURL('/optional-permission.html'));
  permissionPageUrl.searchParams.set('capability', capability);

  const { left, top } = await getPermissionWindowPosition();
  const permissionWindow = await browser.windows.create({
    url: permissionPageUrl.href,
    type: 'popup',
    left,
    top,
    width: PERMISSION_WINDOW_WIDTH,
    height: PERMISSION_WINDOW_HEIGHT,
  });

  if (permissionWindow?.id === undefined) {
    throw new Error('Optional permission window has no ID');
  }

  const key = getStateKey(permissionWindow.id);

  try {
    await browser.storage.local.set({
      [key]: {
        sourceTabId,
        requestId,
        capability,
      } satisfies OptionalPermissionWindowState,
    });
  } catch (error) {
    await browser.windows.remove(permissionWindow.id);
    throw error;
  }
};

export const handleOptionalPermissionWindowRemoved = async (windowId: number): Promise<void> => {
  const key = getStateKey(windowId);
  const storage = await browser.storage.local.get(key);
  const state = storage[key] as OptionalPermissionWindowState | undefined;

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
      msgType: ExtensionMessageType.OptionalPermissionResolved,
      permissionRequestId: state.requestId,
      permissionGranted: granted,
    } satisfies ExtensionMessage);
  } catch {
    // 来源标签页可能已关闭
  }
};
