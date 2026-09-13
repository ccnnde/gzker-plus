import { browser } from 'wxt/browser';

import { ExtensionMessageType } from '@/constants';

import type { OptionalPermissionCapability } from '@/constants';
import type { ExtensionMessage } from '@/types';

const permissionTasks = new Map<OptionalPermissionCapability, { promise: Promise<boolean>; requestId: string }>();

const requestViaPage = (capability: OptionalPermissionCapability, requestId: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const handlePermissionResult = (message: ExtensionMessage) => {
      if (
        message.msgType !== ExtensionMessageType.OptionalPermissionResolved ||
        message.permissionRequestId !== requestId
      ) {
        return;
      }

      browser.runtime.onMessage.removeListener(handlePermissionResult);
      resolve(message.permissionGranted === true);
    };

    browser.runtime.onMessage.addListener(handlePermissionResult);

    browser.runtime
      .sendMessage({
        msgType: ExtensionMessageType.OpenOptionalPermissionPage,
        permissionCapability: capability,
        permissionRequestId: requestId,
      } satisfies ExtensionMessage)
      .catch((error: unknown) => {
        browser.runtime.onMessage.removeListener(handlePermissionResult);
        reject(error);
      });
  });
};

const checkOrRequest = async (capability: OptionalPermissionCapability, requestId: string): Promise<boolean> => {
  const hasPermission = await browser.runtime.sendMessage({
    msgType: ExtensionMessageType.CheckOptionalPermission,
    permissionCapability: capability,
  } satisfies ExtensionMessage);

  if (hasPermission === true) {
    return true;
  }

  return await requestViaPage(capability, requestId);
};

export const ensurePermission = (capability: OptionalPermissionCapability): Promise<boolean> => {
  const existingTask = permissionTasks.get(capability);

  if (existingTask) {
    browser.runtime
      .sendMessage({
        msgType: ExtensionMessageType.FocusOptionalPermissionPage,
        permissionRequestId: existingTask.requestId,
      } satisfies ExtensionMessage)
      .catch((error: unknown) => {
        console.error(error);
      });

    return existingTask.promise;
  }

  const requestId = crypto.randomUUID();
  const promise = checkOrRequest(capability, requestId).finally(() => {
    if (permissionTasks.get(capability)?.promise === promise) {
      permissionTasks.delete(capability);
    }
  });

  permissionTasks.set(capability, { promise, requestId });
  return promise;
};
