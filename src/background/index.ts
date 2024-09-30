import { runtime, tabs } from 'webextension-polyfill';

import { uploadImg } from '@/api/sm-img';
import { base64ToFile, initStorage, sendMessageToTab, waitTime } from '@/utils';
import { ExtensionMessageType, OptionsRouteNames, OptionsRoutePaths } from '@/constants';

import type { Tabs } from 'webextension-polyfill';
import type { Base64File, BiliUploadedImg, ExtensionMessage } from '@/types';

const BILI_IMG_TAB_URL = 'https://www.bilibili.com/gzk-img-upload';
let biliImgTab: Tabs.Tab | undefined;
let isBiliImgTabOpened = false;

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
  } else if (reason === 'update') {
    openOptionsPage(OptionsRoutePaths[OptionsRouteNames.ChangeLog]);
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
    case ExtensionMessageType.UploadBiliImg: {
      if (isBiliImgTabOpened) {
        await waitTime(200);
      } else {
        isBiliImgTabOpened = true;

        biliImgTab = await tabs.create({
          url: BILI_IMG_TAB_URL,
          active: false,
        });
      }

      const imgData: BiliUploadedImg = await sendMessageToTab(biliImgTab?.id, message);
      return imgData.image_url;
    }
    case ExtensionMessageType.CloseBiliImgTab:
      if (biliImgTab) {
        await tabs.remove(biliImgTab.id as number);
      }

      biliImgTab = undefined;
      isBiliImgTabOpened = false;

      return;
  }
});
