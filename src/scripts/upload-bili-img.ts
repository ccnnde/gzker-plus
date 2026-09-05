import Cookies from 'js-cookie';
import { browser } from 'wxt/browser';

import { uploadImg } from '@/api/bili-img';
import { base64ToFile } from '@/utils';
import { ExtensionMessageType } from '@/constants';

import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import type { Base64File, ExtensionMessage } from '@/types';

export const setupBiliImgUpload = (ctx: ContentScriptContext) => {
  const csrf = Cookies.get('bili_jct') || '';
  const originalTitle = document.title;
  let originalBodyHtml: string | undefined;

  const handleDomContentLoaded = () => {
    originalBodyHtml = document.body.innerHTML;
    document.title = '哔哩哔哩图床 - 上传中';
    document.body.innerHTML = '此页面用于「过早客 Plus」插件上传图片到哔哩哔哩';
  };

  const handleMessage = async (message: ExtensionMessage) => {
    switch (message.msgType) {
      case ExtensionMessageType.UploadBiliImg: {
        const imgFile = base64ToFile(message.imgFile as Base64File);
        return await uploadImg(csrf, imgFile);
      }
    }
  };

  ctx.addEventListener(window, 'DOMContentLoaded', handleDomContentLoaded);
  browser.runtime.onMessage.addListener(handleMessage);

  ctx.onInvalidated(() => {
    browser.runtime.onMessage.removeListener(handleMessage);
    document.title = originalTitle;

    if (originalBodyHtml !== undefined && document.body) {
      document.body.innerHTML = originalBodyHtml;
    }
  });
};
