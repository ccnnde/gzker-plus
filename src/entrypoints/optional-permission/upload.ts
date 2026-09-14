import { browser } from 'wxt/browser';

import { t } from '@/i18n';
import { getRequiredElement } from '@/utils';
import { isUploadCapability, requestPermission } from '@/utils/permissions';
import { ExtensionMessageType, OptionalPermissionCapability, OptionsRouteNames, OptionsRoutePaths } from '@/constants';

import type { ExtensionMessage, UploadPermissionCapability } from '@/types';

export const initUploadPermission = (): void => {
  const requestedCapability = new URLSearchParams(window.location.search).get('capability');
  const capability = isUploadCapability(requestedCapability) ? requestedCapability : undefined;
  const hostCopy: Record<UploadPermissionCapability, { name: string; alternative: string }> = {
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
  const title = getRequiredElement<HTMLHeadingElement>('title');
  const description = getRequiredElement<HTMLParagraphElement>('description');
  const alternative = getRequiredElement<HTMLDivElement>('alternative');
  const alternativeText = getRequiredElement<HTMLParagraphElement>('alternative-text');
  const instructionsButton = getRequiredElement<HTMLButtonElement>('instructions');
  const status = getRequiredElement<HTMLParagraphElement>('status');
  const cancelButton = getRequiredElement<HTMLButtonElement>('cancel');
  const allowButton = getRequiredElement<HTMLButtonElement>('allow');
  const invalidCapabilityText = t('optionalPermission.invalidCapability');
  let descriptionCopy = invalidCapabilityText;

  if (selectedHost) {
    descriptionCopy = t('imageHostPermission.description', { platform: selectedHost.name });
  }

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
