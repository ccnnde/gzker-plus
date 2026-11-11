/**
 * 主题链接元素
 */
export const SELECTOR_TOPIC_LINK = 'a[href^="/t/"]:not([href*="?p="])';

/**
 * 主题详情中的悬赏区块
 */
export const SELECTOR_TOPIC_BOUNTY = ':scope > section#gzk-bounty';

/**
 * 回复元数据中的悬赏采纳标记
 */
export const SELECTOR_REPLY_BOUNTY_ACCEPTED = ':scope > .gzk-bounty-accepted';

/**
 * Topic reply total element
 */
export const SELECTOR_TOPIC_REPLY_TOTAL = '.flat-reply-list-total, .nested-reply-list-total';
export const SELECTOR_ENHANCED_REPLY_ITEM = '[data-gzkp-reply-id]';
export const SELECTOR_REPLY_EDIT_BUTTON = '[data-gzkp-reply-edit]';

/**
 * 用户链接元素
 */
export const SELECTOR_USER_LINK = 'a[href^="/u/"]:not([href*="?p="])';

export const SELECTOR_USER_DISPLAY_NAME = 'a.gzk-display-name[href^="/u/"]';

/**
 * 旧版用户名链接元素（存在显示名链接时属于重复内容）
 */
export const SELECTOR_USER_LEGACY_ID = 'a.gzk-legacy-id';

/**
 * 用户页中的私信链接元素
 */
export const SELECTOR_PROFILE_DIRECT_MESSAGE_LINK = 'a.gzk-dm-profile-link';

/**
 * 用户信用等级元素
 */
export const SELECTOR_CREDIT_LEVEL = '.gzk-credit-level';

/**
 * 节点链接元素
 */
export const SELECTOR_NODE_LINK = 'a[href^="/node/"]:not([href*="?p="])';
export const SELECTOR_TOPIC_NODE_LINK = '.topic-detail .meta .node a[href^="/node/"]';

/**
 * 顶栏导航条元素
 */
export const SELECTOR_TOP_NAVBAR = '.navbar.top-navbar';

/**
 * 网页主要内容区域容器元素
 */
export const SELECTOR_MAIN_CONTAINER = '.navbar.top-navbar + div.container';

/**
 * 导航条右侧元素
 */
export const SELECTOR_NAVBAR_RIGHT = '.navbar-right';

/**
 * 论坛原生主题切换入口
 */
export const SELECTOR_THEME_SWITCH = '.gzk-nav-theme';

export const SELECTOR_SHORTCUT_TRIGGER = `${SELECTOR_TOP_NAVBAR} .gzk-nav-shortcuts > .gzk-shortcut-trigger`;
export const SELECTOR_OPEN_SHORTCUT_DIALOG = 'dialog#gzk-shortcut-dialog[open]';
export const SELECTOR_SHORTCUT_ENABLED_CHECKBOX = '#gzk-shortcut-dialog #gzk-shortcut-enabled';

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
export const SELECTOR_USER_MENTION_LINK = 'a[href^="/u/"]';

/**
 * 用户资料弹窗触发元素
 */
export const SELECTOR_USER_INFO_TRIGGER = '[data-gzkp-user-info-trigger]';

/**
 * 未读消息提醒元素
 */
export const SELECTOR_MSG_UNREAD_INDICATOR = 'a.notification-indicator.contextually-unread';

/**
 * 搜索表单元素
 */
export const SELECTOR_SEARCH_FORM = 'form.J_search.gzk-header-search';

/**
 * 移动端搜索入口元素
 */
export const SELECTOR_MOBILE_SEARCH_LINK = '.gzk-mobile-search > a[href="/search"]';

/**
 * 非 emoji 图片元素
 */
export const SELECTOR_NOT_EMOJI_IMG = 'img:not([src^="https://face.t.sinajs.cn"],[src^="https://img.whzxc.cn/bd"],[src^="/static/emoji"])';
