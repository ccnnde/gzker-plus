import { ExtensionMessageType, LanguageType, OptionsKey } from '@/constants';

import type { Component } from 'vue';
import type { Pinia } from 'pinia';
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
  [OptionsKey.DblclickToTop]: CheckedOption;
}

export interface CheckedOption {
  checked: boolean;
}

export interface StorageSettings {
  options: Options;
  lang: LanguageType;
}

export type CreateScriptApp = (pinia: Pinia) => void;

export interface ScriptAppOptions {
  root: Component;
  pinia: Pinia;
  containerId: string;
  containerParentNode: Element | null;
}
