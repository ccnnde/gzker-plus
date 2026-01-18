import { nanoid } from 'nanoid';
import { commands, contextMenus, runtime, tabs } from 'webextension-polyfill';

import { uploadImg } from '@/api/sm-img';
import { base64ToFile, initStorage, sendMessageToTab, waitTime } from '@/utils';
import { addImgHistory } from '@/utils/bili-img-store';
import {
  ExtensionMessageType,
  GZK_URL,
  GZK_URL_PATTERN,
  GzkCtxMenuIds,
  OptionsRouteNames,
  OptionsRoutePaths,
} from '@/constants';

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

      await addImgHistory({
        id: nanoid(),
        name: message.imgFile?.name as string,
        url: imgData.location,
        width: imgData.image_width,
        height: imgData.image_height,
        size: imgData.img_size,
        date: Date.now(),
      });

      return imgData.location;
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

contextMenus.create({
  id: GzkCtxMenuIds.Root,
  title: '过早客 Plus',
  contexts: ['all'],
  documentUrlPatterns: [GZK_URL_PATTERN],
});

contextMenus.create({
  id: GzkCtxMenuIds.OpenExtOptions,
  parentId: GzkCtxMenuIds.Root,
  title: '过早客 Plus 设置',
  contexts: ['all'],
  documentUrlPatterns: [GZK_URL_PATTERN],
});

contextMenus.create({
  id: GzkCtxMenuIds.BlockKeyword,
  parentId: GzkCtxMenuIds.Root,
  title: '屏蔽包含"%s"的主题',
  contexts: ['selection'],
  documentUrlPatterns: [GZK_URL_PATTERN],
});

contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case GzkCtxMenuIds.OpenExtOptions:
      openOptionsPage();
      break;
    case GzkCtxMenuIds.BlockKeyword: {
      if (tab?.id) {
        tabs.sendMessage(tab.id, {
          msgType: ExtensionMessageType.BlockKeyword,
          keyword: info.selectionText?.trim(),
        });
      }

      break;
    }
  }
});

commands.onCommand.addListener(async (command) => {
  switch (command) {
    case GzkCtxMenuIds.BlockKeyword: {
      const [tab] = await tabs.query({ active: true, currentWindow: true });

      if (tab?.id && tab?.url?.includes(GZK_URL)) {
        tabs.sendMessage(tab.id, {
          msgType: ExtensionMessageType.BlockKeyword,
          keyword: '',
        });
      }

      break;
    }
  }
});
