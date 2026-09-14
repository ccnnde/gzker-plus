import { browser } from 'wxt/browser';

import { t } from '@/i18n';
import { getRequiredElement } from '@/utils';
import { requestPermission } from '@/utils/permissions';
import { DOWNLOAD_WINDOW_STATE_KEY, ExtensionMessageType, OptionalPermissionCapability } from '@/constants';

import type { DownloadWindowState } from '@/types';

const getWindowState = async (): Promise<DownloadWindowState | undefined> => {
  const storage = await browser.storage.local.get(DOWNLOAD_WINDOW_STATE_KEY);
  return storage[DOWNLOAD_WINDOW_STATE_KEY] as DownloadWindowState | undefined;
};

const getValidImgUrl = (value?: string | null) => {
  if (!value) {
    return;
  }

  try {
    const { protocol } = new URL(value);
    return ['blob:', 'data:', 'http:', 'https:'].includes(protocol) ? value : undefined;
  } catch {
    return;
  }
};

const downloadImg = async (
  imgUrl: string,
  options: {
    sourceTabId?: number;
    status: HTMLParagraphElement;
    allowButton: HTMLButtonElement;
  },
) => {
  const { sourceTabId, status, allowButton } = options;

  try {
    if (!browser.downloads) {
      throw new Error('Downloads API is unavailable');
    }

    await browser.downloads.download({
      url: imgUrl,
    });

    if (sourceTabId !== undefined) {
      try {
        await browser.tabs.sendMessage(sourceTabId, {
          msgType: ExtensionMessageType.DownloadImgSuccess,
        });
      } catch {
        // 下载过程中来源标签页可能已关闭
      }
    }

    window.close();
  } catch (error) {
    console.error(error);
    status.textContent = t('downloadPermission.downloadFailed');
    status.hidden = false;
    allowButton.textContent = t('downloadPermission.retry');
    allowButton.disabled = false;
    allowButton.hidden = false;
  }
};

export const initDownloadPermission = async (): Promise<void> => {
  const title = getRequiredElement<HTMLHeadingElement>('title');
  const description = getRequiredElement<HTMLParagraphElement>('description');
  const status = getRequiredElement<HTMLParagraphElement>('status');
  const cancelButton = getRequiredElement<HTMLButtonElement>('cancel');
  const allowButton = getRequiredElement<HTMLButtonElement>('allow');

  document.title = t('downloadPermission.title');
  title.textContent = t('downloadPermission.title');
  description.textContent = t('downloadPermission.description');
  cancelButton.textContent = t('common.cancel');
  allowButton.textContent = t('downloadPermission.allow');

  const windowState = await getWindowState();
  const imgUrl = getValidImgUrl(windowState?.imgUrl ?? new URLSearchParams(window.location.search).get('imgUrl'));
  const downloadImmediately =
    windowState?.downloadImmediately ?? new URLSearchParams(window.location.search).get('download') === 'true';

  cancelButton.addEventListener('click', () => {
    window.close();
  });

  allowButton.addEventListener('click', async () => {
    if (!imgUrl) {
      status.textContent = t('downloadPermission.invalidImage');
      status.hidden = false;
      return;
    }

    allowButton.disabled = true;
    status.hidden = true;

    try {
      if (downloadImmediately) {
        const latestState = await getWindowState();
        const latestImgUrl = getValidImgUrl(latestState?.imgUrl ?? imgUrl);

        if (!latestImgUrl) {
          status.textContent = t('downloadPermission.invalidImage');
          status.hidden = false;
          allowButton.disabled = false;
          return;
        }

        await downloadImg(latestImgUrl, {
          sourceTabId: latestState?.sourceTabId,
          status,
          allowButton,
        });
        return;
      }

      const granted = await requestPermission(OptionalPermissionCapability.DownloadImage);

      if (!granted) {
        status.textContent = t('downloadPermission.denied');
        status.hidden = false;
        allowButton.disabled = false;
        return;
      }

      const latestState = await getWindowState();
      const latestImgUrl = getValidImgUrl(latestState?.imgUrl ?? imgUrl);

      if (!latestImgUrl) {
        status.textContent = t('downloadPermission.invalidImage');
        status.hidden = false;
        allowButton.disabled = false;
        return;
      }

      await browser.storage.local.set({
        [DOWNLOAD_WINDOW_STATE_KEY]: {
          ...latestState,
          imgUrl: latestImgUrl,
          downloadImmediately: true,
        } satisfies DownloadWindowState,
      });

      const downloadPageUrl = new URL(window.location.href);
      downloadPageUrl.searchParams.set('download', 'true');
      window.location.replace(downloadPageUrl.href);
    } catch (error) {
      console.error(error);
      status.textContent = t('downloadPermission.requestFailed');
      status.hidden = false;
      allowButton.disabled = false;
    }
  });

  if (!imgUrl) {
    status.textContent = t('downloadPermission.invalidImage');
    status.hidden = false;
    allowButton.disabled = true;
  } else if (downloadImmediately) {
    allowButton.hidden = true;
    await downloadImg(imgUrl, {
      sourceTabId: windowState?.sourceTabId,
      status,
      allowButton,
    });
  }
};
