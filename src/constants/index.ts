import { SELECTOR_NODE_LINK, SELECTOR_TOPIC_LINK, SELECTOR_USER_LINK } from './selector';

import type { ElementPositionAndSize, Options, StorageSettings } from '@/types';

/**
 * 过早客论坛地址
 */
export const GZK_URL = 'https://www.guozaoke.com';

/**
 * 根组件类名前缀
 */
export const APP_ROOT_CLASS_PREFIX = 'gzk-app-';

/**
 * Loading 暗色背景
 */
export const LOADING_BACKGROUND_DARK = 'rgba(0, 0, 0, 0.7)';

/**
 * Options 页面路由名称
 */
export const enum OptionsRouteNames {
  BasicSetting = 'basicSetting',
  BlockedTopics = 'blockedTopics',
  BiliImages = 'biliImages',
  ImageHosting = 'imageHosting',
  ChangeLog = 'changeLog',
  About = 'about',
}

/**
 * Options 页面路由路径
 */
export const OptionsRoutePaths: Record<OptionsRouteNames, string> = {
  [OptionsRouteNames.BasicSetting]: '/basic-setting',
  [OptionsRouteNames.BlockedTopics]: '/blocked-topics',
  [OptionsRouteNames.BiliImages]: '/bili-images',
  [OptionsRouteNames.ImageHosting]: '/image-hosting',
  [OptionsRouteNames.ChangeLog]: '/change-log',
  [OptionsRouteNames.About]: '/about',
};

/**
 * 扩展发送和接受的消息类型
 */
export const enum ExtensionMessageType {
  OpenOptionsPage,
  UploadImg,
  UploadBiliImg,
  CloseBiliImgTab,
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

export const enum DialogType {
  TopicViewer = 'topicViewer',
  TopicEditor = 'topicEditor',
  ReplyEditor = 'replyEditor',
}

export const enum GzkInfoType {
  GzkLogo = 'gzkLogo',
  Profile = 'profile',
  TabIcon = 'tabIcon',
  TabTitle = 'tabTitle',
}

export const GzkInfoHideClass: Partial<Record<GzkInfoType, string>> = {
  [GzkInfoType.GzkLogo]: 'hide-gzk-logo',
  [GzkInfoType.Profile]: 'hide-profile',
};

export const enum BellStyle {
  None = 'none',
  Normal = 'normal',
  BadgeDot = 'badgeDot',
  BadgeNum = 'badgeNum',
}

export const enum ReplyType {
  Topic = 'topic',
  Mention = 'mention',
}

export const enum ImageHostingPlatform {
  Smms = 'smms',
  Bili = 'bili',
}

export const enum OptionsKey {
  BlankLink = 'blankLink',
  DblclickToTop = 'dblclickToTop',
  FloatUserInfo = 'floatUserInfo',
  EnhancedMsg = 'enhancedMsg',
  EnhancedTopic = 'enhancedTopic',
  SmApiKey = 'smApiKey',
  CloseDialogOnClickModal = 'closeDialogOnClickModal',
  HideGzkInfo = 'hideGzkInfo',
  ImageHosting = 'imageHosting',
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
  [OptionsKey.EnhancedMsg]: {
    bellStyle: BellStyle.BadgeNum,
  },
  [OptionsKey.EnhancedTopic]: {
    checked: true,
  },
  [OptionsKey.SmApiKey]: {
    apiKey: '',
  },
  [OptionsKey.CloseDialogOnClickModal]: {
    checkedDialogTypes: [],
  },
  [OptionsKey.HideGzkInfo]: {
    checkedGzkInfoTypes: [],
  },
  [OptionsKey.ImageHosting]: {
    platform: ImageHostingPlatform.Smms,
  },
};

export const defaultExtensionStorage: StorageSettings = {
  options: defaultExtensionOptions,
  lang: LanguageType.ZH,
  blockedTopicList: [],
};

export const initialElementPositionAndSize: ElementPositionAndSize = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
};

export const topicLinkRegExp = /\/t\/(\d+)(#reply(\d+)?)?$/;
