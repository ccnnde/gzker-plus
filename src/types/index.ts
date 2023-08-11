import { ExtensionMessageType, LanguageType, OptionsKey } from '@/constants';

import type { Component } from 'vue';
import type { Pinia } from 'pinia';
import type { BellStyle, LinkElementType, ReplyType } from '@/constants';

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

export interface SettingProps<T extends OptionsKey> {
  settings: Options[T];
}

export interface Options {
  [OptionsKey.BlankLink]: {
    checkedLinkTypes: LinkElementType[];
  };
  [OptionsKey.DblclickToTop]: CheckedOption;
  [OptionsKey.FloatUserInfo]: CheckedOption;
  [OptionsKey.EnhancedMsg]: {
    bellStyle: BellStyle;
  };
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

export interface UserInfo {
  uid?: string;
  avatarUrl?: string;
  memberNo?: string;
  checkInTime?: string;
  topicNumber?: string;
  replyNumber?: string;
  favoriteNumber?: string;
  creditValue?: string;
  followed?: boolean;
  blocked?: boolean;
}

export interface ElementPositionAndSize {
  left: number | string;
  top: number | string;
  width: number | string;
  height: number | string;
}

export interface UserMessage {
  uid?: string;
  userLink?: string;
  avatarUrl?: string;
  topicTitle?: string;
  topicLink?: string;
  replyType?: ReplyType;
  replyContent?: string;
}
