import { browser } from 'wxt/browser';

import {
  BILI_IMAGE_HOST_ORIGIN,
  BILI_IMAGE_PAGE_ORIGIN,
  ImageHostingPlatform,
  OptionalPermissionCapability,
  SM_IMAGE_HOST_ORIGIN,
} from '@/constants';

import type { Browser } from 'wxt/browser';
import type { OptionalPermissionDefinition } from '@/types';

const smmsImageOrigin = `${SM_IMAGE_HOST_ORIGIN}/*`;
const biliImageHostOrigin = `${BILI_IMAGE_HOST_ORIGIN}/*`;
const biliImagePageOrigin = `${BILI_IMAGE_PAGE_ORIGIN}/*`;

const getBiliImagePermissions = (): Browser.permissions.Permissions => {
  if (import.meta.env.FIREFOX) {
    return { origins: [biliImageHostOrigin, biliImagePageOrigin] };
  }

  return { origins: [biliImagePageOrigin], permissions: ['scripting'] };
};

const permissionDefinitions: Record<OptionalPermissionCapability, OptionalPermissionDefinition> = {
  [OptionalPermissionCapability.UploadSmmsImage]: {
    permissions: { origins: [smmsImageOrigin] },
  },
  [OptionalPermissionCapability.UploadBiliImage]: {
    permissions: getBiliImagePermissions(),
  },
};

export const getUploadCapability = (platform: ImageHostingPlatform): OptionalPermissionCapability => {
  if (platform === ImageHostingPlatform.Smms) {
    return OptionalPermissionCapability.UploadSmmsImage;
  }

  if (platform === ImageHostingPlatform.Bili) {
    return OptionalPermissionCapability.UploadBiliImage;
  }

  throw new Error(`Unknown image hosting platform: ${platform}`);
};

export const getPermissionDefinition = (
  capability: OptionalPermissionCapability,
): OptionalPermissionDefinition | undefined => {
  if (!Object.hasOwn(permissionDefinitions, capability)) {
    return;
  }

  return permissionDefinitions[capability];
};

export const hasPermission = async (capability: OptionalPermissionCapability): Promise<boolean> => {
  const definition = getPermissionDefinition(capability);

  if (!definition) {
    throw new Error(`Unknown optional permission capability: ${capability}`);
  }

  return await browser.permissions.contains(definition.permissions);
};

export const requestPermission = (capability: OptionalPermissionCapability): Promise<boolean> => {
  const definition = getPermissionDefinition(capability);

  if (!definition) {
    throw new Error(`Unknown optional permission capability: ${capability}`);
  }

  return browser.permissions.request(definition.permissions);
};
