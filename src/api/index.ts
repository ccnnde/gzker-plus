import { request } from '@/utils';
import { ReplyType } from '@/constants';
import { SELECTOR_MSG_UNREAD_INDICATOR } from '@/constants/selector';

import type { UserInfo, UserMessage } from '@/types';

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

const parseUserMsgList = (htmlStr: string): UserMessage[] => {
  const msgList = htmlStr.split('<div class="notification-item">');

  if (msgList.length < 2) {
    return [];
  }

  const lastMsgIndex = msgList.length - 1;
  msgList[lastMsgIndex] = msgList[lastMsgIndex].split('<div class="ui-footer">')[0];
  msgList.shift();

  return msgList.map((item) => ({
    uid: item.match(/<a href="\/u\/([^"]+)">/)?.[1],
    userLink: item.match(/<a href="(\/u\/[^"]+)">/)?.[1],
    avatarUrl: item.match(/<a href="\/u\/[^"]+">\n\s+<img src="([^"]+)" alt="" class="avatar" \/>/)?.[1],
    topicTitle: item.match(/<a href="\/t\/[^"]+">(.+)<\/a>/)?.[1],
    topicLink: item.match(/<a href="(\/t\/[^"]+)">.+<\/a>/)?.[1],
    replyType: /回复了你的主题/.test(item) ? ReplyType.Topic : ReplyType.Mention,
    replyContent: item.match(/<div class="content"><p>(.+)<\/p>/s)?.[1],
  }));
};

export const API_USER = '/u/';

export const API_MSG = '/notifications';

export const getUserInfo = async (uid: string): Promise<UserInfo> => {
  const data = await request(`${API_USER}${uid}`);
  return parseUserInfo(data);
};

export const followUser = async (uid: string | undefined) => {
  const data = await request(`/f/user/${uid}`);
  return parseUserInfo(data);
};

export const blockUser = async (memberNo: string | undefined): Promise<UserInfo> => {
  const data = await request(`/u/${memberNo}/block`);
  return parseUserInfo(data);
};

export const unblockUser = async (memberNo: string | undefined): Promise<UserInfo> => {
  const data = await request(`/u/${memberNo}/unblock`);
  return parseUserInfo(data);
};

export const getUserMsgList = async (page: number): Promise<UserMessage[]> => {
  const data = await request(`${API_MSG}?p=${page}`);
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
