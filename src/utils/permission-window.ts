import { browser } from 'wxt/browser';

export const PERMISSION_WINDOW_HEIGHT = 400;
export const PERMISSION_WINDOW_WIDTH = 520;

export const focusPermissionWindow = async (windowId?: number): Promise<boolean> => {
  if (windowId === undefined) {
    return false;
  }

  try {
    await browser.windows.get(windowId);
    await browser.windows.update(windowId, { focused: true });
    return true;
  } catch {
    return false;
  }
};

export const getPermissionWindowPosition = async (): Promise<{ left: number | undefined; top: number | undefined }> => {
  const currentWindow = await browser.windows.getLastFocused();
  let left: number | undefined;
  let top: number | undefined;

  if (currentWindow.left !== undefined && currentWindow.width !== undefined) {
    const horizontalOffset = (currentWindow.width - PERMISSION_WINDOW_WIDTH) / 2;
    left = Math.round(currentWindow.left + horizontalOffset);
  }

  if (currentWindow.top !== undefined && currentWindow.height !== undefined) {
    const verticalOffset = (currentWindow.height - PERMISSION_WINDOW_HEIGHT) / 2;
    top = Math.round(currentWindow.top + verticalOffset);
  }

  return { left, top };
};
