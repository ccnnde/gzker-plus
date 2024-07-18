import { decode } from 'html-entities';

import { getXsrfToken, request, waitTime } from '@/utils';
import { ReplyType } from '@/constants';
import { SELECTOR_MSG_UNREAD_INDICATOR } from '@/constants/selector';

import type {
  TreeNode,
  UserInfo,
  UserMessage,
  UserReplyItem,
  UserTopic,
  UserTopicDetail,
  UserTopicStatus,
} from '@/types';

const parseUserInfo = (htmlStr: string): UserInfo => {
  return {
    uid: htmlStr.match(/<div class="username">([^<]+)<\/div>/)?.[1],
    avatarUrl: htmlStr.match(/<a href="\/u\/[^"]+">\n\s+<img src="([^"]+)" alt="" class="avatar" \/>/)?.[1],
    memberNo: htmlStr.match(/过早客第(\d+)号成员/)?.[1],
    checkInTime: htmlStr.match(/入住于(\d{4}-\d{2}-\d{2})/)?.[1],
    topicNumber: htmlStr.match(/<a href="\/u\/[^"]+\/topics">(\d+)<\/a>/)?.[1],
    replyNumber: htmlStr.match(/<a href="\/u\/[^"]+\/replies">(\d+)<\/a>/)?.[1],
    favoriteNumber: htmlStr.match(/<a href="\/u\/[^"]+\/favorites">(\d+)<\/a>/)?.[1],
    creditValue: htmlStr.match(/<strong>(\d+)<\/strong> 信用/)?.[1],
    followed: /<a href="\/f\/user\/[^"]+"[^>]*>取消关注<\/a>/.test(htmlStr),
    blocked: /<strong>此帐号已屏蔽, <a href="\/u\/\d+\/unblock">解除<\/a>/.test(htmlStr),
  };
};

const parseEditedReply = (htmlStr: string): string => {
  return htmlStr.match(/<textarea [^>]*>(.+?)<\/textarea>/s)?.[1] || '';
};

const parseEditedTopic = (htmlStr: string): UserTopicDetail => {
  const title = htmlStr.match(
    /<input class="form-control" id="prependedInput" type="text" placeholder="主题" name="title" value="(.+?)">/,
  )?.[1];

  return {
    title: decode(title),
    content: htmlStr.match(/<textarea [^>]*>(.+?)<\/textarea>/s)?.[1],
  };
};

const parseUserTopic = (htmlStr: string): UserTopic => {
  let detail: UserTopicDetail = {};
  let list: UserReplyItem[] = [];
  let total = htmlStr.match(/<div class="ui-header">.+?<span>共收到(\d+)条回复<\/span>/s)?.[1];

  if (total === undefined) {
    detail = parseTopicDetail(htmlStr);
    total = '0';
  } else {
    const [detailHtmlStr, replyHtmlStr] = htmlStr.split('class="topic-reply');
    detail = parseTopicDetail(detailHtmlStr);
    list = parseTopicReplyList(replyHtmlStr);
  }

  return {
    detail,
    status: parseTopicStatus(htmlStr),
    reply: {
      total,
      list,
    },
  };
};

const parseTopicDetail = (htmlStr: string): UserTopicDetail => {
  return {
    title: decode(htmlStr.match(/<h3 class="title">([^<]+)<\/h3>/)?.[1]),
    authorId: htmlStr.match(/<a href="\/u\/([^"]+)"( target="_blank")?>/)?.[1],
    authorLink: htmlStr.match(/<a href="(\/u\/[^"]+)"( target="_blank")?>/)?.[1],
    avatarUrl: htmlStr.match(
      /<a href="\/u\/[^"]+"(?: target="_blank")?>\n\s+<img src="([^"]+)" alt="" class="avatar"( \/)?>/,
    )?.[1],
    meta: {
      nodeInfo: htmlStr.match(/<span class="node">(.+)<\/span>/)?.[1],
      authorInfo: htmlStr.match(/<span class="username">(.+?)<\/span>/s)?.[1],
      createdTime: htmlStr.match(/<span class="created-time">(.+)<\/span>/)?.[1],
      lastReplyUser: htmlStr.match(/<span class="last-reply-username">(.+?)<\/span>/s)?.[1],
      lastReplyTime: htmlStr.match(/<span class="last-reply-time">(.+)<\/span>/)?.[1],
    },
    content: htmlStr.match(/<div class="ui-content">(.+)<\/div>\s+?<div class="ui-footer">/s)?.[1],
    liked: /<a href="" class="J_topicVote" data-type="">感谢已表示<\/a>/.test(htmlStr),
    likeNumber: htmlStr.match(/<span class="up_vote fr mr10">(\d+) 人赞<\/span>/)?.[1],
    favorited: /<a href="[^"]+" class="J_topicFavorite" data-type="unfavorite">取消收藏<\/a>/.test(htmlStr),
    favoriteNumber: htmlStr.match(/<span class="favorited fr mr10">(\d+) 人收藏<\/span>/)?.[1],
    clickNumber: htmlStr.match(/<span class="hits fr mr10">(\d+) 次点击<\/span>/)?.[1],
    editable: /<a href="\/t\/edit\/\d+" class="fr hidden-mobile">编辑主题<\/a>/.test(htmlStr),
  };
};

const parseTopicStatus = (htmlStr: string): UserTopicStatus => {
  const createReplyHtmlStr = htmlStr
    .split('<div class="topic-reply-create')[1]
    .split('<div class="col-md-3 sidebar-right')[0];

  return {
    unbindedPhone: /请绑定手机号后，再发言/.test(createReplyHtmlStr),
    locked: /本帖已锁/.test(createReplyHtmlStr),
  };
};

const parseTopicReplyList = (htmlStr: string): UserReplyItem[] => {
  const replyList = htmlStr.split('<div class="reply-item">');

  if (replyList.length < 2) {
    return [];
  }

  const lastReplyIndex = replyList.length - 1;
  replyList[lastReplyIndex] = replyList[lastReplyIndex].split('<div class="ui-footer">')[0];
  replyList.shift();

  return replyList.map((item): UserReplyItem => {
    const [timeMatch, ipMatch] = [...item.matchAll(/<span class="time">([^<|楼主]+)<\/span>/g)];

    return {
      uid: item.match(/<a href="\/u\/([^"]+)"( target="_blank")?>/)?.[1],
      userLink: item.match(/<a href="(\/u\/[^"]+)"( target="_blank")?>/)?.[1],
      avatarUrl: item.match(
        /<a href="\/u\/[^"]+"(?: target="_blank")?>\n\s+<img src="([^"]+)" alt="" class="avatar"( \/)?>/,
      )?.[1],
      isOriginalPoster: /<span class="time">楼主<\/span>/.test(item),
      replyId: item.match(/<a class="J_replyVote" data-count="\d+" href="\/replyVote\?reply_id=(\d+)">/)?.[1],
      replyNo: item.match(/<span class="fr floor">#(\d+)<\/span>/)?.[1],
      replyTime: timeMatch?.[1],
      replyIp: ipMatch?.[1],
      content: item.match(/<span class="content">(.+)<\/span>/s)?.[1],
      liked: false,
      likeNumber: item.match(/<a class="J_replyVote" data-count="(\d+)" href="[^"]+">/)?.[1],
      editable: /<a href="\/reply\/edit\/\d+">编辑回复<\/a>/.test(item),
    };
  });
};

const parseUserMsgList = (htmlStr: string): UserMessage[] => {
  const msgList = htmlStr.split('<div class="notification-item">');

  if (msgList.length < 2) {
    return [];
  }

  const lastMsgIndex = msgList.length - 1;
  msgList[lastMsgIndex] = msgList[lastMsgIndex].split('<div class="ui-footer">')[0];
  msgList.shift();

  return msgList.map((item): UserMessage => {
    return {
      uid: item.match(/<a href="\/u\/([^"]+)">/)?.[1],
      userLink: item.match(/<a href="(\/u\/[^"]+)">/)?.[1],
      avatarUrl: item.match(/<a href="\/u\/[^"]+">\n\s+<img src="([^"]+)" alt="" class="avatar" \/>/)?.[1],
      topicTitle: item.match(/<a href="\/t\/[^"]+">(.+)<\/a>/)?.[1],
      topicLink: item.match(/<a href="(\/t\/[^"]+)">.+<\/a>/)?.[1],
      replyType: /回复了你的主题/.test(item) ? ReplyType.Topic : ReplyType.Mention,
      replyContent: item.match(/<div class="content">(.+)<\/div>/s)?.[1],
    };
  });
};

const parseNodeList = (htmlStr: string): TreeNode[] => {
  const nodeNavHtmlStr = htmlStr.match(/节点导航.+?<\/h4>.+?<ul>(.+?)<\/ul>/s)?.[1];

  if (!nodeNavHtmlStr) {
    return [];
  }

  const nodeTypesHtmlStr = [...nodeNavHtmlStr.matchAll(/<li>.+?<\/li>/gs)];

  return nodeTypesHtmlStr.map(([item]): TreeNode => {
    const nodeType = item.match(/<label for="">(.+?)<\/label>/)?.[1];
    const nodeList = [...item.matchAll(/<a href="\/node\/(\w+?)">(.+?)<\/a>/g)].map(
      (node): TreeNode => ({
        value: node[1],
        label: node[2],
      }),
    );

    return {
      value: nodeType,
      label: nodeType,
      children: nodeList,
    };
  });
};

const checkAlertInfo = (htmlStr: string) => {
  const alertHtmlStr = htmlStr.match(/<form [^>]*>.+?<ul class="alert alert-danger">(.+?)<\/ul>.+?<textarea/s)?.[1];

  if (alertHtmlStr) {
    const alertInfo = [...alertHtmlStr.matchAll(/<li>(.+?)<\/li>/g)].map((item) => item[1]).join('，');
    throw new Error(alertInfo);
  }
};

export const API_USER = '/u/';

export const API_TOPIC = '/t/';

export const API_MSG = '/notifications';

export const getUserInfo = async (uid: string): Promise<UserInfo> => {
  const data = await request(`${API_USER}${uid}`);
  return parseUserInfo(data);
};

export const followUser = async (uid?: string) => {
  const data = await request(`/f/user/${uid}`);
  return parseUserInfo(data);
};

export const blockUser = async (memberNo?: string): Promise<UserInfo> => {
  const data = await request(`${API_USER}${memberNo}/block`);
  return parseUserInfo(data);
};

export const unblockUser = async (memberNo?: string): Promise<UserInfo> => {
  const data = await request(`${API_USER}${memberNo}/unblock`);
  return parseUserInfo(data);
};

export const getUserMsgList = async (page: number): Promise<UserMessage[]> => {
  const data = await request(`${API_MSG}?p=${page}`);
  await waitTime();
  return parseUserMsgList(data);
};

export const getUnreadUserMsgNum = (): number => {
  const msgIndicatorEle = document.querySelector(SELECTOR_MSG_UNREAD_INDICATOR) as HTMLAnchorElement;

  if (!msgIndicatorEle) {
    return 0;
  }

  const unreadNum = msgIndicatorEle.title.match(/你有(\d+)条未读提醒/)?.[1];
  return unreadNum ? Number(unreadNum) : 0;
};

export const getUserTopic = async (topicId: string | undefined, page: number): Promise<UserTopic> => {
  const data = await request(`${API_TOPIC}${topicId}?p=${page}`);
  return parseUserTopic(data);
};

export const favoriteTopic = async (topicId?: string): Promise<string> => {
  const data = await request(`/favorite?topic_id=${topicId}`);
  return data;
};

export const unfavoriteTopic = async (topicId?: string): Promise<string> => {
  const data = await request(`/unfavorite?topic_id=${topicId}`);
  return data;
};

export const likeTopic = async (topicId?: string): Promise<string> => {
  const data = await request(`/vote?topic_id=${topicId}`);
  return data;
};

export const getEditedTopic = async (topicId?: string): Promise<UserTopicDetail> => {
  const data = await request(`/t/edit/${topicId}`);
  return parseEditedTopic(data);
};

export const createTopic = async (node: string, title: string, content: string) => {
  await request(`/t/create/${node}`, {
    method: 'POST',
    body: new URLSearchParams({
      title,
      content,
      _xsrf: getXsrfToken(),
    }),
  });
};

export const modifyTopic = async (topicId: string, title: string, content: string): Promise<UserTopic> => {
  const data = await request(`/t/edit/${topicId}`, {
    method: 'POST',
    body: new URLSearchParams({
      title,
      content,
      _xsrf: getXsrfToken(),
    }),
  });

  checkAlertInfo(data);

  return parseUserTopic(data);
};

export const likeReply = async (replyId?: string): Promise<string> => {
  const data = await request(`/replyVote?reply_id=${replyId}`);
  return data;
};

export const getEditedReply = async (replyId?: string): Promise<UserReplyItem> => {
  const data = await request(`/reply/edit/${replyId}`);

  return {
    replyId,
    content: parseEditedReply(data),
  };
};

export const createReply = async (topicId: string, content: string): Promise<UserTopic> => {
  const data = await request(`${API_TOPIC}${topicId}`, {
    method: 'POST',
    body: new URLSearchParams({
      tid: topicId,
      content,
      _xsrf: getXsrfToken(),
    }),
  });

  return parseUserTopic(data);
};

export const modifyReply = async (replyId: string, content: string): Promise<UserTopic> => {
  const data = await request(`/reply/edit/${replyId}`, {
    method: 'POST',
    body: new URLSearchParams({
      rid: replyId,
      content,
      _xsrf: getXsrfToken(),
    }),
  });

  checkAlertInfo(data);

  return parseUserTopic(data);
};

export const getNodeList = async (): Promise<TreeNode[]> => {
  const data = await request('/nodes');
  return parseNodeList(data);
};

export { parseUserTopic };
