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
 * 搜索表单容器元素
 */
export const SELECTOR_SEARCH_FORM = '.navbar-form .form-group';

/**
 * 非 emoji 图片元素
 */
export const SELECTOR_NOT_EMOJI_IMG = 'img:not([src^="https://face.t.sinajs.cn"],[src^="https://img.whzxc.cn/bd"],[src^="/static/emoji"])';

/**
 * 必应搜索结果容器
 */
export const SELECTOR_BING_RESULTS = '#b_results';

/**
 * 必应搜索结果项
 */
export const SELECTOR_BING_RESULT_ITEMS = '#b_results > li.b_algo';

/**
 * 必应搜索中指向过早客的标题链接
 */
export const SELECTOR_BING_GZK_TITLE_LINK = 'h2 > a[href^="https://www.guozaoke.com/t/"]';

/**
 * 必应搜索结果文字描述(caption)
 */
export const SELECTOR_BING_CAPTION_DESC = '.b_caption p.b_lineclamp2';

/**
 * 必应搜索结果图片描述(imgcap)
 */
export const SELECTOR_BING_IMGCAP_DESC = '.b_imgcap_main p.b_lineclamp2';

/**
 * 必应搜索"下一页"链接
 */
export const SELECTOR_BING_NEXT_PAGE = 'nav a[aria-label="下一页"]';
