/**
 * 主题链接元素
 */
export const SELECTOR_TOPIC_LINK = 'a[href^="/t/"]:not([href*="?p="])';

/**
 * 用户链接元素
 */
export const SELECTOR_USER_LINK = 'a[href^="/u/"]:not([href*="?p="])';

/**
 * 节点链接元素
 */
export const SELECTOR_NODE_LINK = 'a[href^="/node/"]:not([href*="?p="])';

/**
 * 导航条右侧元素
 */
export const SELECTOR_NAVBAR_RIGHT = '.navbar-right';

/**
 * 用户头像元素
 */
export const SELECTOR_USER_AVATAR = 'a[href^="/u/"] > img.avatar';

/**
 * 登录用户头像链接元素
 */
export const SELECTOR_LOGIN_USER_LINK = '.navbar-right a[href^="/u/"]';

/**
 * 提及用户链接元素
 */
export const SELECTOR_USER_MENTION_LINK = 'a[href^="/u/"].user-mention';

/**
 * 未读消息提醒元素
 */
export const SELECTOR_MSG_UNREAD_INDICATOR = 'a.notification-indicator.contextually-unread';

/**
 * 非 emoji 图片元素
 */
export const SELECTOR_NOT_EMOJI_IMG = 'img:not([src^="https://face.t.sinajs.cn"],[src^="https://img.whzxc.cn/bd"],[src^="/static/emoji"])';
