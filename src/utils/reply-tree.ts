import { parseReplyMentions } from '@/utils/reply-content';

import type { UserReplyItem, UserReplyMention, UserReplyTreeNode } from '@/types';

interface ReplyTreeContext {
  nodeByReplyNo: Map<string, UserReplyTreeNode>;
  latestNodeByUid: Map<string, UserReplyTreeNode>;
}

const getMentionParent = (mention: UserReplyMention, context: ReplyTreeContext): UserReplyTreeNode | undefined => {
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

  const mentionedUids = new Set(mentions.map(({ uid }) => uid));

  if (mentionedUids.size > 1 && !multipleInsideOne) {
    return undefined;
  }

  for (let index = mentions.length - 1; index >= 0; index--) {
    const parentNode = getMentionParent(mentions[index], context);

    if (parentNode) {
      return parentNode;
    }
  }

  return undefined;
};

const buildReplyTree = (replyList: UserReplyItem[], multipleInsideOne: boolean): UserReplyTreeNode[] => {
  const rootNodes: UserReplyTreeNode[] = [];
  const nodeByReplyNo = new Map<string, UserReplyTreeNode>();
  const latestNodeByUid = new Map<string, UserReplyTreeNode>();

  replyList.forEach((reply) => {
    const mentions = parseReplyMentions(reply.content);
    const parentNode = getReplyParent(mentions, multipleInsideOne, {
      nodeByReplyNo,
      latestNodeByUid,
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

    if (reply.uid) {
      latestNodeByUid.set(reply.uid, node);
    }
  });

  return rootNodes;
};

export { buildReplyTree, parseReplyMentions };
