import { browser } from 'wxt/browser';

import i18n, { t } from '@/i18n';
import { getStorage } from '@/utils';
import { getPermissionDefinition, requestPermission } from '@/utils/optional-permission';
import { ExtensionMessageType, OptionalPermissionCapability, OptionsRouteNames, OptionsRoutePaths } from '@/constants';

import type { ExtensionMessage } from '@/types';

import '@/styles/permission-window.scss';

const getElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }

  return element as T;
};

const getCapability = (): OptionalPermissionCapability | undefined => {
  const value = new URLSearchParams(window.location.search).get('capability');

  if (!value) {
    return;
  }

  const capability = value as OptionalPermissionCapability;
  return getPermissionDefinition(capability) ? capability : undefined;
};

const init = async () => {
  const { lang } = await getStorage();
  i18n.global.locale.value = lang;

  const capability = getCapability();
  const hostCopy: Record<OptionalPermissionCapability, { name: string; alternative: string }> = {
    [OptionalPermissionCapability.UploadSmmsImage]: {
      name: t('basicSetting.imageHosting.platform.smms'),
      alternative: t('imageHostPermission.alternativeBili'),
    },
    [OptionalPermissionCapability.UploadBiliImage]: {
      name: t('basicSetting.imageHosting.platform.bili'),
      alternative: t('imageHostPermission.alternativeSmms'),
    },
  };
  const selectedHost = capability ? hostCopy[capability] : undefined;
  const title = getElement<HTMLHeadingElement>('title');
  const description = getElement<HTMLParagraphElement>('description');
  const alternative = getElement<HTMLDivElement>('alternative');
  const alternativeText = getElement<HTMLParagraphElement>('alternative-text');
  const instructionsButton = getElement<HTMLButtonElement>('instructions');
  const status = getElement<HTMLParagraphElement>('status');
  const cancelButton = getElement<HTMLButtonElement>('cancel');
  const allowButton = getElement<HTMLButtonElement>('allow');
  const invalidCapabilityText = t('optionalPermission.invalidCapability');
  let descriptionCopy = invalidCapabilityText;

  if (selectedHost) {
    descriptionCopy = t('imageHostPermission.description', { platform: selectedHost.name });
  }

  document.documentElement.lang = lang;
  document.title = capability ? t('imageHostPermission.title') : invalidCapabilityText;
  title.textContent = document.title;
  description.textContent = descriptionCopy;
  alternative.hidden = !selectedHost;
  alternativeText.textContent = selectedHost?.alternative ?? '';
  instructionsButton.textContent = t('imageHostPermission.viewInstructions');
  cancelButton.textContent = t('common.cancel');
  allowButton.textContent = capability ? t('imageHostPermission.allow') : '';
  allowButton.hidden = !capability;

  cancelButton.addEventListener('click', () => {
    window.close();
  });

  instructionsButton.addEventListener('click', () => {
    browser.runtime
      .sendMessage({
        msgType: ExtensionMessageType.OpenOptionsPage,
        extPagePath: OptionsRoutePaths[OptionsRouteNames.ImageHosting],
      } satisfies ExtensionMessage)
      .catch((error: unknown) => {
        console.error(error);
      });
  });

  allowButton.addEventListener('click', async () => {
    if (!capability) {
      return;
    }

    allowButton.disabled = true;
    status.hidden = true;

    try {
      const granted = await requestPermission(capability);

      if (granted) {
        window.close();
        return;
      }

      status.textContent = t('imageHostPermission.denied');
    } catch (error) {
      console.error(error);
      status.textContent = t('imageHostPermission.requestFailed');
    }

    status.hidden = false;
    allowButton.disabled = false;
  });
};

init();
