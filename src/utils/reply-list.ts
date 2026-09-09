import type { UserReplyItem } from '@/types';

export const mergeReplyInteractionState = (
  nextReplyList: UserReplyItem[],
  currentReplyList: UserReplyItem[],
): UserReplyItem[] => {
  const likedReplyIds = new Set(
    currentReplyList.filter(({ liked, replyId }) => liked && replyId).map(({ replyId }) => replyId as string),
  );

  return nextReplyList.map((reply) => {
    if (!reply.replyId || !likedReplyIds.has(reply.replyId)) {
      return reply;
    }

    return {
      ...reply,
      liked: true,
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

  const liked = updatedReply.liked || Array.from(matchedReplies).some((reply) => reply.liked);

  matchedReplies.forEach((reply) => {
    Object.assign(reply, updatedReply, {
      liked,
    });
  });

  return true;
};
