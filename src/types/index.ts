import type { Component } from 'vue';

import { ExtensionMessageType, LanguageType, OptionsKey } from '@/constants';

import type { LinkElementType } from '@/constants';

interface SettingItem {
  name: string;
  description: string;
  key: OptionsKey;
  component?: Component;
}

export interface ExtensionMessage {
  msgType: ExtensionMessageType;
}

export interface Setting {
  category: string;
  list: SettingItem[];
}

export interface Options {
  [OptionsKey.BlankLink]: {
    checkedLinkTypes: LinkElementType[];
  };
}

export interface CheckedOption {
  checked: boolean;
}

export interface StorageSettings {
  options: Options;
  lang: LanguageType;
}
