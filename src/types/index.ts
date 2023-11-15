import type { Component } from 'vue';
import type { Pinia } from 'pinia';
import type Viewer from 'viewerjs';
import type {
  BellStyle,
  ExtensionMessageType,
  LanguageType,
  LinkElementType,
  OptionsKey,
  ReplyType,
} from '@/constants';

interface SettingItem {
  name: string;
  description: string;
  key: OptionsKey;
  component?: Component;
}

export interface ImageViewer extends Viewer {
  index: number;
  length: number;
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
  [OptionsKey.EnhancedTopic]: CheckedOption;
}

export interface CheckedOption {
  checked: boolean;
}

export interface StorageSettings {
  options: Options;
  lang: LanguageType;
  loginUserId?: string;
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

export interface UserTopic {
  detail: UserTopicDetail;
  reply: UserTopicReply;
}

export interface UserTopicDetail {
  title?: string;
  authorId?: string;
  authorLink?: string;
  avatarUrl?: string;
  meta?: {
    nodeInfo?: string;
    authorInfo?: string;
    createdTime?: string;
    lastReplyUser?: string;
    lastReplyTime?: string;
  };
  content?: string;
  favorited?: boolean;
  favoriteNumber?: string;
  liked?: boolean;
  likeNumber?: string;
  clickNumber?: string;
}

export interface UserTopicReply {
  total: string;
  list: UserReplyItem[];
}

export interface UserReplyItem {
  uid?: string;
  userLink?: string;
  avatarUrl?: string;
  isOriginalPoster?: boolean;
  replyId?: string;
  replyNo?: string;
  replyTime?: string;
  replyIp?: string;
  content?: string;
  liked?: boolean;
  likeNumber?: string;
}

export interface UserReplyMention {
  uid: string;
  floor?: string;
}

export interface ApiJsonResponse {
  message: string;
  success: 0 | 1;
}
