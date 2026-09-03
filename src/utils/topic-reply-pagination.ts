import { TOPIC_REPLY_PAGE_SIZE } from '@/constants';

import type { PageDataSeed, UserReplyBatch, UserReplyItem, UserTopic, UserTopicDetail, UserTopicStatus } from '@/types';

interface UpdateReverseTopBatchesOptions {
  batches: UserReplyBatch[];
  oldTotal: number;
  newTotal: number;
  lastPageList: UserReplyItem[];
}

interface UpdateReverseTopPageOptions {
  replyList: UserReplyItem[];
  oldTotal: number;
  newTotal: number;
  lastPageList: UserReplyItem[];
}

interface CreateFirstPageTopicDataOptions {
  detail: UserTopicDetail | undefined;
  status: UserTopicStatus | undefined;
  total: string;
  list: UserReplyItem[];
}

export const getParsedTopicPage = (search: string, total: string, list: UserReplyItem[]): number => {
  const requestedPage = Number(new URLSearchParams(search).get('p'));

  if (requestedPage > 0) {
    return requestedPage;
  }

  const firstReplyNo = Number(list[0]?.replyNo);

  if (firstReplyNo > 0) {
    return Math.ceil(firstReplyNo / TOPIC_REPLY_PAGE_SIZE);
  }

  return total === '0' ? 1 : Math.max(Math.ceil(Number(total) / TOPIC_REPLY_PAGE_SIZE), 1);
};

export const createTopicPageSeed = (page: number, data: UserTopic): PageDataSeed<UserTopic> | undefined => {
  const total = Number(data.reply.total);
  const totalPageNumber = Math.max(Math.ceil(total / TOPIC_REPLY_PAGE_SIZE), 1);

  if (page < 1 || page > totalPageNumber || (total > 0 && data.reply.list.length === 0)) {
    return undefined;
  }

  return {
    page,
    data,
  };
};

export const updateReverseTopBatches = ({
  batches,
  oldTotal,
  newTotal,
  lastPageList,
}: UpdateReverseTopBatchesOptions): UserReplyBatch[] => {
  const newLastPage = Math.ceil(newTotal / TOPIC_REPLY_PAGE_SIZE);
  const oldLastPage = Math.ceil(oldTotal / TOPIC_REPLY_PAGE_SIZE);

  if (newLastPage < oldLastPage) {
    return batches;
  }

  if (newLastPage > oldLastPage) {
    const newBatch: UserReplyBatch = {
      startPage: newLastPage,
      endPage: newLastPage,
      list: lastPageList,
    };

    return [newBatch, ...batches];
  }

  const topBatch = batches[0];

  if (!topBatch || topBatch.endPage !== oldLastPage) {
    return batches;
  }

  const oldTopPageLength = oldTotal - (oldLastPage - 1) * TOPIC_REPLY_PAGE_SIZE;
  const reservedList = topBatch.list.slice(0, Math.max(topBatch.list.length - oldTopPageLength, 0));
  const updatedTopBatch: UserReplyBatch = {
    ...topBatch,
    list: reservedList.concat(lastPageList),
  };

  return [updatedTopBatch, ...batches.slice(1)];
};

export const updateReverseTopPage = ({
  replyList,
  oldTotal,
  newTotal,
  lastPageList,
}: UpdateReverseTopPageOptions): UserReplyItem[] => {
  const newLastPage = Math.ceil(newTotal / TOPIC_REPLY_PAGE_SIZE);
  const oldLastPage = Math.ceil(oldTotal / TOPIC_REPLY_PAGE_SIZE);

  if (newLastPage < oldLastPage) {
    return replyList;
  }

  const reversedList = [...lastPageList].reverse();

  if (newLastPage > oldLastPage) {
    return reversedList.concat(replyList);
  }

  const oldTopPageLength = oldTotal - (oldLastPage - 1) * TOPIC_REPLY_PAGE_SIZE;
  return reversedList.concat(replyList.slice(oldTopPageLength));
};

export const createFirstPageTopicData = ({
  detail,
  status,
  total,
  list,
}: CreateFirstPageTopicDataOptions): UserTopic | undefined => {
  if (!detail || !status) {
    return undefined;
  }

  return {
    detail,
    status,
    reply: {
      total,
      list: list.slice(0, TOPIC_REPLY_PAGE_SIZE),
    },
  };
};
