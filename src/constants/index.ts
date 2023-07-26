import { SELECTOR_NODE_LINK, SELECTOR_TOPIC_LINK, SELECTOR_USER_LINK } from './selector';

import type { ElementPositionAndSize, Options, StorageSettings } from '@/types';

/**
 * 根组件类名前缀
 */
export const APP_ROOT_CLASS_PREFIX = 'gzk-app-';

/**
 * 扩展发送和接受的消息类型
 */
export const enum ExtensionMessageType {
  OpenOptionsPage,
}

/**
 * 多语言类型
 */
export const enum LanguageType {
  ZH = 'zh',
  EN = 'en',
}

export const enum LinkElementType {
  Topic = 'topic',
  User = 'user',
  Node = 'node',
}

export const LinkElementSelector: Record<LinkElementType, string> = {
  [LinkElementType.Topic]: SELECTOR_TOPIC_LINK,
  [LinkElementType.User]: SELECTOR_USER_LINK,
  [LinkElementType.Node]: SELECTOR_NODE_LINK,
};

export const enum OptionsKey {
  BlankLink = 'blankLink',
  DblclickToTop = 'dblclickToTop',
  FloatUserInfo = 'floatUserInfo',
}

export const defaultExtensionOptions: Options = {
  [OptionsKey.BlankLink]: {
    checkedLinkTypes: [],
  },
  [OptionsKey.DblclickToTop]: {
    checked: false,
  },
  [OptionsKey.FloatUserInfo]: {
    checked: true,
  },
};

export const defaultExtensionStorage: StorageSettings = {
  options: defaultExtensionOptions,
  lang: LanguageType.ZH,
};

export const initialElementPositionAndSize: ElementPositionAndSize = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
};
