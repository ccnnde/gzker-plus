import type { UserReplyItem } from '@/types';

export const mergeReplyInteractionState = (
  nextReplyList: UserReplyItem[],
  currentReplyList: UserReplyItem[],
): UserReplyItem[] => {
  const currentReplies = new Map(currentReplyList.map((reply) => [reply.replyId, reply]));

  return nextReplyList.map((reply) => {
    const currentReply = reply.replyId ? currentReplies.get(reply.replyId) : undefined;

    if (currentReply?.liked === undefined) {
      return reply;
    }

    return {
      ...reply,
      liked: currentReply.liked,
      likeNumber: currentReply.likeNumber,
    };
  });
};

export const updateReplyInLists = (replyLists: UserReplyItem[][], updatedReply: UserReplyItem): boolean => {
  if (!updatedReply.replyId) {
    return false;
  }

  const matchedReplies = new Set<UserReplyItem>();

  replyLists.forEach((replyList) => {
    replyList.forEach((reply) => {
      if (reply.replyId === updatedReply.replyId) {
        matchedReplies.add(reply);
      }
    });
  });

  if (matchedReplies.size === 0) {
    return false;
  }

  matchedReplies.forEach((reply) => {
    Object.assign(reply, updatedReply);
  });

  return true;
};
