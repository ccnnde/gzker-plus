import { request } from '@/utils';

import type { UserInfo } from '@/types';

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

export const API_USER = '/u/';

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
