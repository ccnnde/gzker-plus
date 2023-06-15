import { runtime } from 'webextension-polyfill';

import { ExtensionMessageType } from '@/constants';
import { ExtensionMessage } from '@/types';

runtime.onInstalled.addListener((details) => {
  const { reason } = details;

  if (reason === 'install') {
    runtime.openOptionsPage();
  }
});

runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.msgType === ExtensionMessageType.OpenOptionsPage) {
    runtime.openOptionsPage();
  }
});
