import { getXsrfToken, request, requestJson, waitTime } from '@/utils';
import {
  checkAlertInfo,
  parseBlockedUserList,
  parseEditedReply,
  parseEditedTopic,
  parseNodeList,
  parseSearchNodeOptions,
  parseSearchTopicResult,
  parseUserInfo,
  parseUserMessageList,
} from '@/utils/page-parser';
import { mergeTopicReplies } from '@/utils/topic-export';
import { parseUserTopic } from '@/utils/topic-parser';
import { TOPIC_EXPORT_MAX_CONCURRENT, TOPIC_REPLY_PAGE_SIZE } from '@/constants';
import { SELECTOR_MSG_UNREAD_INDICATOR } from '@/constants/selector';

import type {
  FavoriteResponse,
  SearchNodeOption,
  SearchParams,
  SearchTopicResult,
  TreeNode,
  UserInfo,
  UserMessage,
  UserReplyItem,
  UserTopic,
  UserTopicDetail,
  VoteResponse,
} from '@/types';

const vote = async (url: string, voted: boolean): Promise<VoteResponse> => {
  return requestJson<VoteResponse>(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      voted: voted ? '1' : '0',
      _xsrf: getXsrfToken(),
    }),
  });
};

export const API_USER = '/u/';

export const API_TOPIC = '/t/';

export const API_MSG = '/notifications';

export const API_SEARCH = '/search';

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

export const getUserMsgList = async (page: number, signal?: AbortSignal): Promise<UserMessage[]> => {
  const data = await request(`${API_MSG}?p=${page}`, {
    signal,
  });
  await waitTime();
  return parseUserMessageList(data);
};

export const getUnreadUserMsgNum = (): number => {
  const msgIndicatorEle = document.querySelector(SELECTOR_MSG_UNREAD_INDICATOR) as HTMLAnchorElement;

  if (!msgIndicatorEle) {
    return 0;
  }

  const unreadNum = msgIndicatorEle.title.match(/你有(\d+)条未读提醒/)?.[1];
  return unreadNum ? Number(unreadNum) : 0;
};

export const getUserTopic = async (
  topicId: string | undefined,
  page: number,
  signal?: AbortSignal,
): Promise<UserTopic> => {
  const data = await request(`${API_TOPIC}${topicId}?p=${page}`, {
    signal,
  });

  return parseUserTopic(data);
};

export const getTopicExportSnapshot = async (topicId: string, signal?: AbortSignal): Promise<UserTopic> => {
  const firstPageData = await getUserTopic(topicId, 1, signal);
  const totalReplyNumber = Math.max(Number(firstPageData.reply.total), 0);
  const totalPageNumber = Math.max(Math.ceil(totalReplyNumber / TOPIC_REPLY_PAGE_SIZE), 1);
  const pageNumbers = Array.from({ length: Math.max(totalPageNumber - 1, 0) }, (_, index) => index + 2);
  const replyPages: UserReplyItem[][] = [firstPageData.reply.list];

  let nextPageIndex = 0;
  let firstError: unknown;

  const loadPageWorker = async () => {
    while (firstError === undefined) {
      const pageIndex = nextPageIndex++;
      const page = pageNumbers[pageIndex];

      if (page === undefined) {
        return;
      }

      try {
        const pageData = await getUserTopic(topicId, page, signal);
        replyPages[page - 1] = pageData.reply.list;
      } catch (err) {
        firstError = err;
        return;
      }
    }
  };

  const workerCount = Math.min(TOPIC_EXPORT_MAX_CONCURRENT, pageNumbers.length);
  await Promise.all(Array.from({ length: workerCount }, () => loadPageWorker()));

  if (firstError !== undefined) {
    throw firstError;
  }

  const snapshotReplies = mergeTopicReplies(replyPages)
    .filter((reply) => {
      const replyNumber = Number(reply.replyNo);
      return !Number.isInteger(replyNumber) || replyNumber <= totalReplyNumber;
    })
    .slice(0, totalReplyNumber);

  return {
    ...firstPageData,
    reply: {
      ...firstPageData.reply,
      total: String(snapshotReplies.length),
      list: snapshotReplies,
    },
  };
};

export const getSearchPath = (params: SearchParams): string => {
  const searchParams = new URLSearchParams({
    q: params.q,
  });

  const optionalParams = {
    scope: params.scope,
    sort: params.sort,
    node: params.node,
    author: params.author,
    since: params.since,
    until: params.until,
    p: params.p,
  };

  Object.entries(optionalParams).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  return `${API_SEARCH}?${searchParams.toString()}`;
};

export const getSearchNodeOptions = async (signal?: AbortSignal): Promise<SearchNodeOption[]> => {
  const data = await request(API_SEARCH, {
    signal,
  });

  return parseSearchNodeOptions(data);
};

export const searchTopic = async (params: SearchParams, signal?: AbortSignal): Promise<SearchTopicResult> => {
  const data = await request(getSearchPath(params), {
    signal,
  });

  return parseSearchTopicResult(data);
};

export const favoriteTopic = async (topicId?: string): Promise<FavoriteResponse> => {
  return requestJson<FavoriteResponse>(`/favorite?topic_id=${topicId}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-XSRFToken': getXsrfToken(),
    },
  });
};

export const unfavoriteTopic = async (topicId?: string): Promise<FavoriteResponse> => {
  return requestJson<FavoriteResponse>(`/unfavorite?topic_id=${topicId}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-XSRFToken': getXsrfToken(),
    },
  });
};

export const likeTopic = async (topicId: string | undefined, voted: boolean): Promise<VoteResponse> => {
  return vote(`/vote?topic_id=${topicId}`, voted);
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

export const modifyTopic = async (topicId: string, title: string, content: string): Promise<void> => {
  const data = await request(`/t/edit/${topicId}`, {
    method: 'POST',
    body: new URLSearchParams({
      title,
      content,
      _xsrf: getXsrfToken(),
    }),
  });

  checkAlertInfo(data);
};

export const likeReply = async (replyId: string | undefined, voted: boolean): Promise<VoteResponse> => {
  return vote(`/replyVote?reply_id=${replyId}`, voted);
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

export const getBlockedUserList = async (): Promise<string[]> => {
  const data = await request('/setting/blockedUser');
  return parseBlockedUserList(data);
};

export { parseUserTopic };
