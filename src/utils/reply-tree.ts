import { SELECTOR_USER_MENTION_LINK } from '@/constants/selector';

import type { UserReplyItem, UserReplyMention, UserReplyTreeNode } from '@/types';

const USER_LINK_REGEXP = /^\/u\/([^/?#]+)/;
const FLOOR_TEXT_REGEXP = /^\s*#(\d+)/;
const PLAIN_TEXT_MENTION_REGEXP = /(?:^|[^\p{L}\p{N}_-])@([\p{L}\p{N}_-]+)(?:(?:\s|&nbsp;)+#(\d+))?/gu;
const EXCLUDED_MENTION_CONTAINER_SELECTOR = 'blockquote, pre, code';

interface ReplyTreeContext {
  nodeByReplyNo: Map<string, UserReplyTreeNode>;
  latestNodeByUid: Map<string, UserReplyTreeNode>;
}

const getMentionFloor = (mentionElement: HTMLAnchorElement): string | undefined => {
  const nextSiblingText = mentionElement.nextSibling?.textContent || '';
  return nextSiblingText.match(FLOOR_TEXT_REGEXP)?.[1];
};

const parsePlainTextMentions = (content: string): UserReplyMention[] => {
  return [...content.matchAll(PLAIN_TEXT_MENTION_REGEXP)].map((match) => ({
    uid: match[1],
    floor: match[2],
  }));
};

const parseReplyMentions = (content?: string): UserReplyMention[] => {
  if (!content) {
    return [];
  }

  const template = document.createElement('template');
  template.innerHTML = content;

  const mentionElements = template.content.querySelectorAll<HTMLAnchorElement>(SELECTOR_USER_MENTION_LINK);
  const mentions: UserReplyMention[] = [];

  mentionElements.forEach((mentionElement) => {
    if (mentionElement.closest(EXCLUDED_MENTION_CONTAINER_SELECTOR)) {
      return;
    }

    const userLink = mentionElement.getAttribute('href') || '';
    const uid = userLink.match(USER_LINK_REGEXP)?.[1];

    if (!uid) {
      return;
    }

    mentions.push({
      uid,
      floor: getMentionFloor(mentionElement),
    });
  });

  return mentions.length ? mentions : parsePlainTextMentions(content);
};

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
