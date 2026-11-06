import { parseReplyMentions } from '@/utils/reply-content';

import type {
  MentionRepliesResult,
  MentionRepliesTarget,
  UserReplyItem,
  UserReplyMention,
  UserReplyTreeNode,
} from '@/types';

interface ReplyTreeContext {
  nodeByReplyNo: Map<string, UserReplyTreeNode>;
  nodeByReplyId: Map<string, UserReplyTreeNode>;
  latestNodeByUid: Map<string, UserReplyTreeNode>;
  latestNodeByUserId: Map<string, UserReplyTreeNode>;
}

const getMentionParent = (mention: UserReplyMention, context: ReplyTreeContext): UserReplyTreeNode | undefined => {
  if ('userId' in mention) {
    if (!mention.replyId) {
      return context.latestNodeByUserId.get(mention.userId);
    }

    const parent = context.nodeByReplyId.get(mention.replyId);
    return parent?.reply.userId === mention.userId ? parent : undefined;
  }

  if (mention.floor) {
    const explicitParent = context.nodeByReplyNo.get(mention.floor);

    if (explicitParent?.reply.uid === mention.uid) {
      return explicitParent;
    }
  }

  return context.latestNodeByUid.get(mention.uid);
};

const getReplyParent = (
  mentions: UserReplyMention[],
  multipleInsideOne: boolean,
  context: ReplyTreeContext,
): UserReplyTreeNode | undefined => {
  if (!mentions.length) {
    return undefined;
  }

  const mentionedUsers = new Set(
    mentions.map((mention) => {
      if ('uid' in mention) {
        return mention.uid;
      }

      return context.latestNodeByUserId.get(mention.userId)?.reply.uid || mention.userId;
    }),
  );

  if (mentionedUsers.size > 1 && !multipleInsideOne) {
    return undefined;
  }

  for (let index = mentions.length - 1; index >= 0; index--) {
    const mention = mentions[index];

    if (!mention) {
      continue;
    }

    const parentNode = getMentionParent(mention, context);

    if (parentNode) {
      return parentNode;
    }
  }

  return undefined;
};

const buildReplyTree = (replyList: UserReplyItem[], multipleInsideOne: boolean): UserReplyTreeNode[] => {
  const rootNodes: UserReplyTreeNode[] = [];
  const nodeByReplyNo = new Map<string, UserReplyTreeNode>();
  const nodeByReplyId = new Map<string, UserReplyTreeNode>();
  const latestNodeByUid = new Map<string, UserReplyTreeNode>();
  const latestNodeByUserId = new Map<string, UserReplyTreeNode>();

  replyList.forEach((reply) => {
    const mentions = parseReplyMentions(reply.content);
    const parentNode = getReplyParent(mentions, multipleInsideOne, {
      nodeByReplyNo,
      nodeByReplyId,
      latestNodeByUid,
      latestNodeByUserId,
    });
    const node: UserReplyTreeNode = {
      reply,
      children: [],
      depth: parentNode ? parentNode.depth + 1 : 0,
      parentReplyNo: parentNode?.reply.replyNo,
    };

    if (parentNode) {
      parentNode.children.push(node);
    } else {
      rootNodes.push(node);
    }

    if (reply.replyNo) {
      nodeByReplyNo.set(reply.replyNo, node);
    }

    if (reply.replyId) {
      nodeByReplyId.set(reply.replyId, node);
    }

    if (reply.uid) {
      latestNodeByUid.set(reply.uid, node);
    }

    if (reply.userId) {
      latestNodeByUserId.set(reply.userId, node);
    }
  });

  return rootNodes;
};

export const getMentionedUserReplies = (
  source: UserReplyItem[],
  { mention, replyNo }: MentionRepliesTarget,
): MentionRepliesResult => {
  const currentReplyNo = Number(replyNo);
  const replies = source
    .filter((item) => {
      const isMentionedUser = 'userId' in mention ? item.userId === mention.userId : item.uid === mention.uid;
      return Number(item.replyNo) < currentReplyNo && isMentionedUser;
    })
    .sort((left, right) => Number(left.replyNo) - Number(right.replyNo));

  if ('userId' in mention) {
    if (mention.replyId) {
      const explicitReply = replies.find((item) => item.replyId === mention.replyId);
      return { replies: explicitReply ? replies : [], focusReplyNo: explicitReply?.replyNo };
    }

    return { replies, focusReplyNo: replies[replies.length - 1]?.replyNo };
  }

  const explicitReply = replies.find((item) => item.replyNo === mention.floor);
  const focusReply = explicitReply || replies[replies.length - 1];
  return { replies, focusReplyNo: focusReply?.replyNo };
};

export { buildReplyTree, parseReplyMentions };
