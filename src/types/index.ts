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

export interface IFontFaceSet extends FontFaceSet {
  keys: () => IterableIterator<FontFace>;
}

export interface ImageViewer extends Viewer {
  index: number;
  length: number;
}

export interface Base64File {
  name: string;
  type: string;
  base64Str: string;
}

export interface ExtensionMessage {
  msgType: ExtensionMessageType;
  imgFile?: Base64File;
  apiKey?: string;
  extPageName?: string;
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
  [OptionsKey.SmApiKey]: {
    apiKey: string;
  };
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

export interface Coordinates {
  left: number;
  right: number;
  top: number;
  bottom: number;
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
  status: UserTopicStatus;
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
  editable?: boolean;
}

export interface UserTopicStatus {
  unbindedPhone: boolean;
  locked: boolean;
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
  editable?: boolean;
}

export interface UserReplyMention {
  uid: string;
  floor?: string;
}

export interface TreeNode {
  value?: string;
  label?: string;
  children?: TreeNode[];
}

export interface ApiJsonResponse {
  message: string;
  success: 0 | 1;
}

export interface Keybindings {
  [key: string]: ((e: KeyboardEvent) => void) | undefined;
}

export interface SMApiResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
  images?: string;
  RequestId: string;
}

export interface SMUserProfile {
  username: string;
  role: 'user' | 'VIP';
  group_expire: string;
  email: string;
  email_verified: 0 | 1;
  disk_usage: string;
  disk_usage_raw: number;
  disk_limit: string;
  disk_limit_raw: number;
}

export interface SMUploadedImg {
  file_id: number;
  width: number;
  height: number;
  filename: string;
  storename: string;
  size: number;
  path: string;
  hash: string;
  url: string;
  delete: string;
  page: string;
}

export interface CherryFileUploadStatus {
  done: boolean;
  uploadedCallback?: () => void;
}

export type CherryAnchor = [number, number] | false;

export interface TopicForm {
  node: string;
  title: string;
  content: string;
}

export interface EditHistoryItem {
  id: string;
  uid: string;
  topicId?: string;
  replyId?: string;
  node?: string;
  title?: string;
  content?: string;
  createTime: string;
  createTimestamp: number;
  updateTime: string;
  updateTimestamp: number;
}
