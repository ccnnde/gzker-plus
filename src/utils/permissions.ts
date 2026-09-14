import { browser } from 'wxt/browser';

import {
  BILI_IMAGE_HOST_ORIGIN,
  BILI_IMAGE_PAGE_ORIGIN,
  ImageHostingPlatform,
  OptionalPermissionCapability,
  SM_IMAGE_HOST_ORIGIN,
} from '@/constants';

import type { Browser } from 'wxt/browser';
import type { UploadPermissionCapability } from '@/types';

const smmsImageOrigin = `${SM_IMAGE_HOST_ORIGIN}/*`;
const biliImageHostOrigin = `${BILI_IMAGE_HOST_ORIGIN}/*`;
const biliImagePageOrigin = `${BILI_IMAGE_PAGE_ORIGIN}/*`;

const getBiliImagePermissions = (): Browser.permissions.Permissions => {
  if (import.meta.env.FIREFOX) {
    return { origins: [biliImageHostOrigin, biliImagePageOrigin] };
  }

  return { origins: [biliImagePageOrigin], permissions: ['scripting'] };
};

const requirements: Record<OptionalPermissionCapability, Browser.permissions.Permissions> = {
  [OptionalPermissionCapability.DownloadImage]: { permissions: ['downloads'] },
  [OptionalPermissionCapability.UploadSmmsImage]: { origins: [smmsImageOrigin] },
  [OptionalPermissionCapability.UploadBiliImage]: getBiliImagePermissions(),
};

const getRequirements = (capability: OptionalPermissionCapability): Browser.permissions.Permissions => {
  if (!Object.hasOwn(requirements, capability)) {
    throw new Error(`Unknown optional permission capability: ${capability}`);
  }

  return requirements[capability];
};

export const isUploadCapability = (value: unknown): value is UploadPermissionCapability => {
  return (
    value === OptionalPermissionCapability.UploadSmmsImage || value === OptionalPermissionCapability.UploadBiliImage
  );
};

export const getUploadCapability = (platform: ImageHostingPlatform): UploadPermissionCapability => {
  if (platform === ImageHostingPlatform.Smms) {
    return OptionalPermissionCapability.UploadSmmsImage;
  }

  if (platform === ImageHostingPlatform.Bili) {
    return OptionalPermissionCapability.UploadBiliImage;
  }

  throw new Error(`Unknown image hosting platform: ${platform}`);
};

export const hasPermission = async (capability: OptionalPermissionCapability): Promise<boolean> => {
  return await browser.permissions.contains(getRequirements(capability));
};

export const requestPermission = (capability: OptionalPermissionCapability): Promise<boolean> => {
  return browser.permissions.request(getRequirements(capability));
};
