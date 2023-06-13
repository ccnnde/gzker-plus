import { runtime } from 'webextension-polyfill';

runtime.onInstalled.addListener((details) => {
  const { reason } = details;

  if (reason === 'install') {
    runtime.openOptionsPage();
  }
});
