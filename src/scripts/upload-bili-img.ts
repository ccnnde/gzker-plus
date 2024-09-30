import Cookies from 'js-cookie';
import { runtime } from 'webextension-polyfill';

import { uploadImg } from '@/api/bili-img ';
import { base64ToFile } from '@/utils';
import { ExtensionMessageType } from '@/constants';

import type { Base64File, ExtensionMessage } from '@/types';

const csrf = Cookies.get('bili_jct') || '';

window.addEventListener('DOMContentLoaded', () => {
  document.title = '哔哩哔哩图床 - 上传中';
  document.body.innerHTML = '此页面用于「过早客 Plus」插件上传图片到哔哩哔哩';
});

runtime.onMessage.addListener(async (message: ExtensionMessage) => {
  switch (message.msgType) {
    case ExtensionMessageType.UploadBiliImg: {
      const imgFile = base64ToFile(message.imgFile as Base64File);
      return await uploadImg(csrf, imgFile);
    }
  }
});
