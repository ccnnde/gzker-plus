import { parseMetadataLink } from '@/utils';
import {
  SELECTOR_CREDIT_LEVEL,
  SELECTOR_REPLY_BOUNTY_ACCEPT_FORM,
  SELECTOR_REPLY_BOUNTY_ACCEPTED,
  SELECTOR_TOPIC_BOUNTY,
  SELECTOR_USER_DISPLAY_NAME,
  SELECTOR_USER_LINK,
} from '@/constants/selector';

import type {
  BountyAcceptance,
  TopicBounty,
  UserReplyItem,
  UserTopic,
  UserTopicDetail,
  UserTopicStatus,
} from '@/types';

const getUserId = (userLink: string | undefined): string | undefined => {
  return userLink?.match(/^\/u\/(.+)$/)?.[1];
};

const parseTopicBounty = (topicElement: Element | null): TopicBounty | undefined => {
  const bountyElement = topicElement?.querySelector(SELECTOR_TOPIC_BOUNTY);
  const amountElement = bountyElement?.querySelector(':scope > strong');
  const amountText = amountElement?.textContent?.trim().match(/^悬赏\s*(\d+)\s*早点$/)?.[1];

  if (!amountText) {
    const setupHref = bountyElement
      ?.querySelector(':scope > a[href^="/points/bounty/"]')
      ?.getAttribute('href')
      ?.match(/^\/points\/bounty\/\d+$/)?.[0];

    if (setupHref) {
      return { setupHref };
    }

    return undefined;
  }

  const status = amountElement?.nextSibling?.textContent?.trim().match(/^·\s*(.+)$/)?.[1];
  const detailsElement = bountyElement?.querySelector(':scope > p');
  const deadline = detailsElement?.textContent
    ?.trim()
    .match(/^截止\s+([^·]+)/)?.[1]
    ?.trim();
  const acceptedReplyId = detailsElement
    ?.querySelector(':scope > a[href^="#r"]')
    ?.getAttribute('href')
    ?.match(/^#r(\d+)$/)?.[1];
  const disputeAction = bountyElement
    ?.querySelector(':scope > details > form[method="post"]')
    ?.getAttribute('action')
    ?.match(/^\/points\/bounty\/\d+\/dispute$/)?.[0];

  return {
    amount: Number(amountText),
    status,
    deadline,
    acceptedReplyId,
    disputeAction,
  };
};

const parseTopicDetail = (topicDocument: Document): UserTopicDetail => {
  const topicElement = topicDocument.querySelector('.topic-detail');
  const headerElement = topicElement?.querySelector(':scope > .ui-header');
  const metaElement = headerElement?.querySelector('.meta');
  const avatarElement = headerElement?.querySelector<HTMLAnchorElement>(`:scope > ${SELECTOR_USER_LINK}`);
  const usernameElement = metaElement?.querySelector(':scope > .username');
  const authorElement = usernameElement?.querySelector<HTMLAnchorElement>(SELECTOR_USER_LINK) || avatarElement;
  const visibleIdentity = metaElement?.querySelector(':scope > .gzk-visible-identity');
  const displayNameElement = visibleIdentity?.querySelector<HTMLAnchorElement>(SELECTOR_USER_DISPLAY_NAME);
  const authorId =
    displayNameElement?.dataset.username?.trim() || getUserId(authorElement?.getAttribute('href') || undefined);
  const authorLink = displayNameElement?.getAttribute('href') || authorElement?.getAttribute('href') || undefined;
  const lastReplyElement =
    metaElement?.querySelector(':scope > .gzk-last-reply-name') ||
    metaElement?.querySelector(':scope > .last-reply-username');
  const lastReplyAnchor = lastReplyElement?.querySelector(SELECTOR_USER_LINK);
  const lastReplyText = lastReplyElement?.textContent || '';
  const lastReplyName = lastReplyAnchor?.textContent || '';
  const lastReplyNameIndex = lastReplyName ? lastReplyText.indexOf(lastReplyName) : -1;
  const contentElement = topicElement?.querySelector(':scope > .ui-content');
  const editInfoElement = contentElement?.querySelector(':scope > .edit-info');
  const editInfo = editInfoElement?.textContent?.trim();
  const statisticsElement = topicDocument.querySelector('.gzk-topic-stats');
  const ownerActionsElement = topicDocument.querySelector('.gzk-topic-owner-actions');
  const tags = Array.from(
    topicElement?.querySelectorAll<HTMLAnchorElement>(':scope > .topic-tags > a.tag-badge') || [],
  ).map((element) => ({
    name: element.textContent?.trim() || '',
    href: element.getAttribute('href') || '',
  }));

  editInfoElement?.remove();

  return {
    title: headerElement?.querySelector('.title')?.innerHTML,
    authorId,
    authorLink,
    avatarUrl: avatarElement?.querySelector<HTMLImageElement>('img.avatar')?.getAttribute('src') || undefined,
    meta: {
      node: parseMetadataLink(metaElement?.querySelector(':scope > .node > a')),
      authorName: displayNameElement?.dataset.displayName?.trim() || authorElement?.textContent?.trim() || authorId,
      authorLevel: parseMetadataLink(
        visibleIdentity?.querySelector(SELECTOR_CREDIT_LEVEL) || usernameElement?.querySelector(SELECTOR_CREDIT_LEVEL),
      ),
      createdTime: metaElement?.querySelector(':scope > .created-time')?.textContent?.trim(),
      postedAt: topicDocument.querySelector('time.gzk-topic-created')?.getAttribute('datetime') || undefined,
      lastReplyUser: parseMetadataLink(lastReplyAnchor),
      lastReplyPrefix:
        lastReplyNameIndex >= 0 ? lastReplyText.slice(0, lastReplyNameIndex).trim() : lastReplyText.trim(),
      lastReplySuffix:
        lastReplyNameIndex >= 0 ? lastReplyText.slice(lastReplyNameIndex + lastReplyName.length).trim() : '',
      lastReplyTime: metaElement?.querySelector(':scope > .last-reply-time')?.textContent?.trim(),
    },
    content: contentElement?.innerHTML,
    bounty: parseTopicBounty(topicElement),
    editInfo,
    tags,
    liked: topicElement?.querySelector('.J_topicVote')?.getAttribute('data-voted') === '1',
    likeNumber: statisticsElement?.querySelector('.up_vote')?.textContent?.match(/(\d+)\s*人赞/)?.[1],
    favorited: topicElement?.querySelector('.J_topicFavorite')?.getAttribute('data-type') === 'unfavorite',
    favoriteNumber: statisticsElement?.querySelector('.favorited')?.textContent?.match(/(\d+)\s*人收藏/)?.[1],
    clickNumber: topicElement?.querySelector('.hits')?.textContent?.match(/(\d+) 次点击/)?.[1],
    editable: Boolean(ownerActionsElement?.querySelector('a.gzk-topic-edit[href^="/t/edit/"]')),
    deletable: Boolean(ownerActionsElement?.querySelector('a.gzk-topic-delete[href^="/t/destory/"]')),
  };
};

const parseTopicStatus = (topicDocument: Document): UserTopicStatus => {
  const createReplyText = topicDocument.querySelector('.topic-reply-create')?.textContent || '';

  return {
    unbindedPhone: createReplyText.includes('请绑定手机号后，再发言'),
    locked: createReplyText.includes('本帖已锁'),
  };
};

const parseBountyAcceptance = (
  metaElement: Element | null | undefined,
  replyId?: string,
): BountyAcceptance | undefined => {
  const form = metaElement?.querySelector(SELECTOR_REPLY_BOUNTY_ACCEPT_FORM);
  const action = form?.getAttribute('action')?.match(/^\/points\/bounty\/\d+\/accept$/)?.[0];
  const formReplyId = form?.querySelector('input[type="hidden"][name="reply_id"]')?.getAttribute('value');

  if (!action || !replyId || formReplyId !== replyId) {
    return undefined;
  }

  return {
    action,
    replyId,
  };
};

const parseTopicReplyItem = (item: HTMLElement): UserReplyItem => {
  const metaElement = item.querySelector(':scope > .main > .meta');
  const authorElement =
    metaElement?.querySelector<HTMLAnchorElement>(':scope > a.reply-username') ||
    item.querySelector<HTMLAnchorElement>(`:scope > ${SELECTOR_USER_LINK}`);
  const displayNameElement = metaElement?.querySelector<HTMLAnchorElement>(`:scope > ${SELECTOR_USER_DISPLAY_NAME}`);
  const authorLink = authorElement?.getAttribute('href') || undefined;
  const voteElement = metaElement?.querySelector<HTMLAnchorElement>('.J_replyVote');
  const timeElements = Array.from(metaElement?.querySelectorAll<HTMLElement>(':scope > span.time') || []);
  const hasTimeLabel = (label: string) => {
    return timeElements.some((element) => element.textContent?.trim() === label);
  };
  const [replyTimeElement, replyIpElement] = timeElements.filter((element) => {
    const text = element.textContent?.trim();
    return Boolean(text) && text !== '楼主' && text !== '管理员';
  });
  const voteLink = voteElement?.getAttribute('href');
  const replyId = item.id.match(/^r(\d+)$/)?.[1] || voteLink?.match(/[?&]reply_id=(\d+)/)?.[1];
  const replyNumberText = metaElement?.querySelector(':scope > span.floor:not(.reply-to)')?.textContent;
  const hasAdministratorIcon = Boolean(metaElement?.querySelector('.icon-group[title="管理员"]'));
  const isOriginalPoster = hasTimeLabel('楼主');
  const isAdministrator = hasAdministratorIcon || hasTimeLabel('管理员');
  const isBountyAccepted = Boolean(metaElement?.querySelector(SELECTOR_REPLY_BOUNTY_ACCEPTED));

  return {
    uid: displayNameElement?.dataset.username?.trim() || getUserId(authorLink),
    userId: displayNameElement?.dataset.gzkMentionUser,
    displayName: displayNameElement?.dataset.displayName?.trim() || undefined,
    userLink: displayNameElement?.getAttribute('href') || authorLink,
    avatarUrl: item.querySelector<HTMLImageElement>(':scope > a > img.avatar')?.getAttribute('src') || undefined,
    isOriginalPoster,
    isAdministrator,
    isBountyAccepted,
    bountyAcceptance: parseBountyAcceptance(metaElement, replyId),
    replyId,
    replyNo: replyNumberText?.match(/#(\d+)/)?.[1],
    replyTime: replyTimeElement?.textContent?.trim(),
    replyIp: replyIpElement?.textContent?.trim(),
    content: item.querySelector(':scope > .main > .content')?.innerHTML,
    liked: voteElement?.dataset.voted === '1',
    likeNumber: voteElement?.dataset.count,
    editable: item.querySelector('a[href^="/reply/edit/"]') !== null,
  };
};

const parseTopicReplyList = (topicReplyElement: Element | null): UserReplyItem[] => {
  const replyElements = topicReplyElement?.querySelectorAll<HTMLElement>(':scope > .ui-content > .reply-item') || [];

  return Array.from(replyElements).map(parseTopicReplyItem);
};

export const parseUserTopic = (htmlStr: string): UserTopic => {
  const topicDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  const replyElement = topicDocument.querySelector('.topic-reply');
  const total =
    replyElement?.querySelector(':scope > .ui-header span')?.textContent?.match(/共收到(\d+)条回复/)?.[1] || '0';

  return {
    detail: parseTopicDetail(topicDocument),
    status: parseTopicStatus(topicDocument),
    reply: {
      total,
      list: parseTopicReplyList(replyElement),
    },
  };
};
