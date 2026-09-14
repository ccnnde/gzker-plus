import { browser } from 'wxt/browser';

import { ExtensionMessageType } from '@/constants';

import type { ExtensionMessage, UploadPermissionCapability } from '@/types';

const permissionTasks = new Map<UploadPermissionCapability, { promise: Promise<boolean>; requestId: string }>();

const requestViaPage = (capability: UploadPermissionCapability, requestId: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const handlePermissionResult = (message: ExtensionMessage) => {
      if (
        message.msgType !== ExtensionMessageType.UploadPermissionResolved ||
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
        msgType: ExtensionMessageType.OpenUploadWindow,
        permissionCapability: capability,
        permissionRequestId: requestId,
      } satisfies ExtensionMessage)
      .catch((error: unknown) => {
        browser.runtime.onMessage.removeListener(handlePermissionResult);
        reject(error);
      });
  });
};

const checkOrRequest = async (capability: UploadPermissionCapability, requestId: string): Promise<boolean> => {
  const hasPermission = await browser.runtime.sendMessage({
    msgType: ExtensionMessageType.CheckOptionalPermission,
    permissionCapability: capability,
  } satisfies ExtensionMessage);

  if (hasPermission === true) {
    return true;
  }

  return await requestViaPage(capability, requestId);
};

export const ensurePermission = (capability: UploadPermissionCapability): Promise<boolean> => {
  const existingTask = permissionTasks.get(capability);

  if (existingTask) {
    browser.runtime
      .sendMessage({
        msgType: ExtensionMessageType.FocusUploadWindow,
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
