import { runtime } from 'webextension-polyfill';

import { initStorage } from '@/utils';
import { ExtensionMessageType } from '@/constants';

import type { ExtensionMessage } from '@/types';

runtime.onInstalled.addListener(async (details) => {
  const { reason } = details;

  await initStorage();

  if (reason === 'install') {
    runtime.openOptionsPage();
  }
});

runtime.onMessage.addListener((message: ExtensionMessage) => {
  if (message.msgType === ExtensionMessageType.OpenOptionsPage) {
    runtime.openOptionsPage();
  }
});
