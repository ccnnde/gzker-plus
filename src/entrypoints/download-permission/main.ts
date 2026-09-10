import { browser } from 'wxt/browser';

import i18n, { t } from '@/i18n';
import { getStorage } from '@/utils';
import { DOWNLOAD_PERMISSION_WINDOW_STATE_KEY } from '@/constants';

import type { Browser } from 'wxt/browser';
import type { DownloadPermissionWindowState } from '@/types';

import './style.scss';

const DOWNLOAD_PERMISSION: Browser.permissions.Permissions = {
  permissions: ['downloads'],
};

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }

  return element as T;
};

const getDownloadPermissionWindowState = async (): Promise<DownloadPermissionWindowState | undefined> => {
  const storage = await browser.storage.local.get(DOWNLOAD_PERMISSION_WINDOW_STATE_KEY);
  return storage[DOWNLOAD_PERMISSION_WINDOW_STATE_KEY] as DownloadPermissionWindowState | undefined;
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

const downloadImg = async (imgUrl: string, status: HTMLParagraphElement, allowButton: HTMLButtonElement) => {
  try {
    if (!browser.downloads) {
      throw new Error('Downloads API is unavailable');
    }

    await browser.downloads.download({
      url: imgUrl,
    });
    window.close();
  } catch (error) {
    console.error(error);
    status.textContent = t('downloadPermission.requestFailed');
    status.hidden = false;
    allowButton.disabled = false;
    allowButton.hidden = false;
  }
};

const init = async () => {
  const { lang } = await getStorage();
  i18n.global.locale.value = lang;

  const title = getElement<HTMLHeadingElement>('title');
  const description = getElement<HTMLParagraphElement>('description');
  const status = getElement<HTMLParagraphElement>('status');
  const cancelButton = getElement<HTMLButtonElement>('cancel');
  const allowButton = getElement<HTMLButtonElement>('allow');

  document.documentElement.lang = lang;
  document.title = t('downloadPermission.title');
  title.textContent = t('downloadPermission.title');
  description.textContent = t('downloadPermission.description');
  cancelButton.textContent = t('common.cancel');
  allowButton.textContent = t('downloadPermission.allow');

  const permissionWindowState = await getDownloadPermissionWindowState();
  const imgUrl = getValidImgUrl(
    permissionWindowState?.imgUrl ?? new URLSearchParams(window.location.search).get('imgUrl'),
  );
  const downloadImmediately =
    permissionWindowState?.downloadImmediately ??
    new URLSearchParams(window.location.search).get('download') === 'true';

  if (!imgUrl) {
    status.textContent = t('downloadPermission.invalidImage');
    status.hidden = false;
    allowButton.disabled = true;
  } else if (downloadImmediately) {
    allowButton.hidden = true;
    await downloadImg(imgUrl, status, allowButton);
    return;
  }

  cancelButton.addEventListener('click', () => {
    window.close();
  });

  allowButton.addEventListener('click', async () => {
    const latestState = await getDownloadPermissionWindowState();
    const latestImgUrl = getValidImgUrl(latestState?.imgUrl ?? imgUrl);

    if (!latestImgUrl) {
      status.textContent = t('downloadPermission.invalidImage');
      status.hidden = false;
      return;
    }

    allowButton.disabled = true;
    status.hidden = true;

    try {
      const granted = await browser.permissions.request(DOWNLOAD_PERMISSION);

      if (!granted) {
        status.textContent = t('downloadPermission.denied');
        status.hidden = false;
        allowButton.disabled = false;
        return;
      }

      await browser.storage.local.set({
        [DOWNLOAD_PERMISSION_WINDOW_STATE_KEY]: {
          ...latestState,
          imgUrl: latestImgUrl,
          downloadImmediately: true,
        } satisfies DownloadPermissionWindowState,
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
};

init();
