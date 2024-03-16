import { runtime, tabs } from 'webextension-polyfill';

import { uploadImg } from '@/api/sm-img';
import { base64ToFile, initStorage } from '@/utils';
import { ExtensionMessageType, OptionsRouteNames, OptionsRoutePaths } from '@/constants';

import type { Base64File, ExtensionMessage } from '@/types';

const openOptionsPage = async (path?: string) => {
  let optionsPageUrl = runtime.getURL('src/options.html');

  const [tab] = await tabs.query({
    url: optionsPageUrl,
  });

  optionsPageUrl += `#${path || OptionsRoutePaths[OptionsRouteNames.BasicSetting]}`;

  if (tab) {
    tabs.update(tab.id, {
      url: optionsPageUrl,
      active: true,
    });
  } else {
    tabs.create({
      url: optionsPageUrl,
    });
  }
};

runtime.onInstalled.addListener(async (details) => {
  const { reason } = details;

  await initStorage();

  if (reason === 'install') {
    openOptionsPage();
  }
});

runtime.onMessage.addListener(async (message: ExtensionMessage) => {
  switch (message.msgType) {
    case ExtensionMessageType.OpenOptionsPage:
      openOptionsPage(message.extPagePath);
      return;
    case ExtensionMessageType.UploadImg: {
      const imgFile = base64ToFile(message.imgFile as Base64File);
      return await uploadImg(message.apiKey as string, imgFile);
    }
  }
});
