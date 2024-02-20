import { runtime } from 'webextension-polyfill';

import { uploadImg } from '@/api/sm-img';
import { base64ToFile, initStorage } from '@/utils';
import { ExtensionMessageType } from '@/constants';

import type { Base64File, ExtensionMessage } from '@/types';

runtime.onInstalled.addListener(async (details) => {
  const { reason } = details;

  await initStorage();

  if (reason === 'install') {
    runtime.openOptionsPage();
  }
});

runtime.onMessage.addListener(async (message: ExtensionMessage) => {
  switch (message.msgType) {
    case ExtensionMessageType.OpenOptionsPage:
      runtime.openOptionsPage();
      return;
    case ExtensionMessageType.UploadImg: {
      const imgFile = base64ToFile(message.imgFile as Base64File);
      return await uploadImg(message.apiKey as string, imgFile);
    }
  }
});
