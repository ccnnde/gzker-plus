import { escapeRegExp } from 'lodash-es';

import { t } from '@/i18n';
import { parseMetadataLink } from '@/utils';
import { GZK_URL, NoticeKind, ReplyType, SearchResultType } from '@/constants';
import {
  SELECTOR_CREDIT_LEVEL,
  SELECTOR_PROFILE_DIRECT_MESSAGE_LINK,
  SELECTOR_TOPIC_LINK,
  SELECTOR_USER_LINK,
} from '@/constants/selector';

import type {
  MetadataLink,
  SearchNodeOption,
  SearchTopicItem,
  SearchTopicResult,
  TreeNode,
  UserInfo,
  UserMessage,
  UserTopicDetail,
} from '@/types';

const getElementText = (parent: ParentNode | null, selector: string): string | undefined => {
  return parent?.querySelector(selector)?.textContent?.trim() || undefined;
};

const getSearchPageNumber = (link: HTMLAnchorElement | undefined): number | undefined => {
  const href = link?.getAttribute('href');

  if (!href) {
    return undefined;
  }

  const page = Number(new URLSearchParams(href.split('?')[1]).get('p') || 1);
  return Number.isInteger(page) && page > 0 ? page : undefined;
};

const highlightSearchKeywords = (element: HTMLElement | null, query: string): string | undefined => {
  if (!element) {
    return undefined;
  }

  const keywords = Array.from(new Set(query.trim().split(/\s+/).filter(Boolean))).sort(
    (firstKeyword, secondKeyword) => secondKeyword.length - firstKeyword.length,
  );

  if (keywords.length === 0) {
    return element.innerHTML || undefined;
  }

  const pattern = new RegExp(keywords.map(escapeRegExp).join('|'), 'giu');
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;

    if (!textNode.parentElement?.closest('mark')) {
      textNodes.push(textNode);
    }
  }

  textNodes.forEach((textNode) => {
    const text = textNode.data;
    const matches = Array.from(text.matchAll(pattern));

    if (matches.length === 0) {
      return;
    }

    const fragment = element.ownerDocument.createDocumentFragment();
    let lastIndex = 0;

    matches.forEach((match) => {
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        fragment.append(text.slice(lastIndex, matchIndex));
      }

      const markElement = element.ownerDocument.createElement('mark');
      markElement.textContent = match[0];
      fragment.append(markElement);
      lastIndex = matchIndex + match[0].length;
    });

    if (lastIndex < text.length) {
      fragment.append(text.slice(lastIndex));
    }

    textNode.replaceWith(fragment);
  });

  return element.innerHTML || undefined;
};

const getForumUrl = (href: string | null) => {
  if (!href) {
    return undefined;
  }

  try {
    const url = new URL(href, GZK_URL);
    return url.origin === GZK_URL ? url : undefined;
  } catch {
    return undefined;
  }
};

const getMemberNo = (userDocument: Document, profileText: string) => {
  const memberNo = profileText.match(/过早客第\s*(\d+)\s*号成员/)?.[1];

  if (memberNo) {
    return memberNo;
  }

  const memberNumbers = new Set<string>();

  for (const link of userDocument.links) {
    const url = getForumUrl(link.getAttribute('href'));
    const actionMemberNo = url?.pathname.match(/^\/u\/(\d+)\/(?:block|unblock)$/)?.[1];

    if (actionMemberNo) {
      memberNumbers.add(actionMemberNo);
    }
  }

  return memberNumbers.size === 1 ? Array.from(memberNumbers)[0] : undefined;
};

const getProfileUserId = (userDocument: Document, profileElement: Element | null) => {
  const uid = getElementText(profileElement, '.username');

  if (uid) {
    return uid;
  }

  const idLabel = Array.from(userDocument.querySelectorAll('dt')).find((element) => {
    return element.textContent?.trim().toUpperCase() === 'ID';
  });
  const idValue = idLabel?.nextElementSibling;

  if (idValue?.tagName !== 'DD') {
    return undefined;
  }

  return idValue.textContent?.trim() || undefined;
};

const isUserFollowed = (userDocument: Document, uid: string) => {
  const followPath = `/f/user/${uid}`;

  for (const link of userDocument.links) {
    const url = getForumUrl(link.getAttribute('href'));

    if (url?.pathname === followPath && link.textContent?.replace(/\s+/g, '') === '取消关注') {
      return true;
    }
  }

  return false;
};

const isUserBlocked = (userDocument: Document, memberNo: string | undefined) => {
  if (!memberNo) {
    return false;
  }

  const unblockPath = `/u/${memberNo}/unblock`;

  for (const link of userDocument.links) {
    const url = getForumUrl(link.getAttribute('href'));

    if (url?.pathname === unblockPath) {
      return true;
    }
  }

  return false;
};

const getMessageTitleParts = (element: Element | null): MetadataLink[] => {
  return Array.from(element?.childNodes || []).flatMap((node): MetadataLink[] => {
    if (node.nodeType === Node.TEXT_NODE) {
      return [{ text: node.textContent || '' }];
    }

    if (!(node instanceof Element) || node.matches('script, style')) {
      return [];
    }

    if (node.matches('a')) {
      const url = getForumUrl(node.getAttribute('href'));

      return [
        {
          text: node.textContent || '',
          href: url ? `${url.pathname}${url.search}${url.hash}` : undefined,
        },
      ];
    }

    return getMessageTitleParts(node);
  });
};

const getMessageReplyType = (noticeKind: string | undefined, title: string): ReplyType | undefined => {
  if (noticeKind === NoticeKind.Reply) {
    return ReplyType.Topic;
  }

  if (noticeKind === NoticeKind.Mention) {
    return ReplyType.Mention;
  }

  if (noticeKind !== undefined) {
    return undefined;
  }

  if (title.includes('回复了你的主题')) {
    return ReplyType.Topic;
  }

  if (title.includes('中提到了你')) {
    return ReplyType.Mention;
  }

  return undefined;
};

export const parseUserInfo = (htmlStr: string): UserInfo => {
  const userDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  const profileElement = userDocument.querySelector('.user-page .profile');
  const statisticsElement = userDocument.querySelector('.user-page .usercard');
  const profileText = profileElement?.textContent || userDocument.body.textContent || '';
  const uid = getProfileUserId(userDocument, profileElement);
  const memberNo = getMemberNo(userDocument, profileText);
  const checkInTime = profileText.match(/入住于\s*(\d{4}-\d{2}-\d{2})/)?.[1];

  if (!uid || (!memberNo && !checkInTime)) {
    throw new Error(t('floatUserInfo.parseFailed'));
  }

  return {
    uid,
    directMessageLink: parseMetadataLink(profileElement?.querySelector(SELECTOR_PROFILE_DIRECT_MESSAGE_LINK)),
    creditLevel: parseMetadataLink(profileElement?.querySelector(SELECTOR_CREDIT_LEVEL)),
    avatarUrl: profileElement?.querySelector<HTMLImageElement>('img.avatar')?.getAttribute('src') || undefined,
    memberNo,
    checkInTime,
    topicNumber: getElementText(statisticsElement, '.status-topic strong'),
    replyNumber: getElementText(statisticsElement, '.status-reply strong'),
    favoriteNumber: getElementText(statisticsElement, '.status-favorite strong'),
    topicListPublic: Boolean(statisticsElement?.querySelector('.status-topic strong a[href]')),
    replyListPublic: Boolean(statisticsElement?.querySelector('.status-reply strong a[href]')),
    favoriteListPublic: Boolean(statisticsElement?.querySelector('.status-favorite strong a[href]')),
    topicListTitle:
      statisticsElement?.querySelector('.status-topic strong [title]')?.getAttribute('title') || undefined,
    replyListTitle:
      statisticsElement?.querySelector('.status-reply strong [title]')?.getAttribute('title') || undefined,
    favoriteListTitle:
      statisticsElement?.querySelector('.status-favorite strong [title]')?.getAttribute('title') || undefined,
    creditValue: getElementText(statisticsElement, '.status-reputation strong'),
    followed: isUserFollowed(userDocument, uid),
    blocked: isUserBlocked(userDocument, memberNo),
  };
};

export const parseEditedReply = (htmlStr: string): string => {
  const replyDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  return replyDocument.querySelector('textarea')?.innerHTML || '';
};

export const parseEditedTopic = (htmlStr: string): UserTopicDetail => {
  const topicDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  const titleElement = topicDocument.querySelector<HTMLInputElement>('input[name="title"]');

  return {
    title: titleElement?.getAttribute('value') || undefined,
    content: topicDocument.querySelector('textarea')?.innerHTML || undefined,
  };
};

export const parseUserMessageList = (htmlStr: string): UserMessage[] => {
  const messageDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  const messageElements = messageDocument.querySelectorAll<HTMLElement>('.notification-item');

  return Array.from(messageElements).map((messageElement): UserMessage => {
    const titleElement = messageElement.querySelector('.main .title');
    const avatarElement = messageElement.querySelector<HTMLImageElement>(':scope > a > img.avatar');
    const userElement = titleElement?.querySelector<HTMLAnchorElement>(SELECTOR_USER_LINK);
    const userLink = userElement?.getAttribute('href') || undefined;
    const topicElement = titleElement?.querySelector<HTMLAnchorElement>(SELECTOR_TOPIC_LINK);
    const noticeKind = messageElement.getAttribute('data-notice-kind') || undefined;

    return {
      uid: userLink?.match(/^\/u\/(.+)$/)?.[1],
      userLink,
      avatarUrl: avatarElement?.getAttribute('src') || undefined,
      noticeKind,
      titleParts: getMessageTitleParts(titleElement),
      createdTime: getElementText(messageElement, '.gzk-notice-time'),
      topicTitle: topicElement?.textContent?.trim() || undefined,
      topicLink: topicElement?.getAttribute('href') || undefined,
      replyType: getMessageReplyType(noticeKind, titleElement?.textContent || ''),
      replyContent: messageElement.querySelector('.content')?.innerHTML,
    };
  });
};

export const parseSearchTopicResult = (htmlStr: string): SearchTopicResult => {
  const searchDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  const searchElement = searchDocument.querySelector('.gzk-search');

  if (!searchElement) {
    throw new Error('解析搜索结果失败');
  }

  const statusText = getElementText(searchElement, ':scope > .search-status') || '';
  const query = searchElement.querySelector<HTMLInputElement>('input[name="q"]')?.value || '';
  const paginationLinks = Array.from(searchElement.querySelectorAll<HTMLAnchorElement>(':scope > .search-pages a'));
  const elapsedMilliseconds = statusText.match(/(\d+)\s*毫秒/)?.[1];
  const previousPageLink = paginationLinks.find((link) => link.textContent?.trim() === '上一页');
  const nextPageLink = paginationLinks.find((link) => link.textContent?.trim() === '下一页');
  const resultElements = searchElement.querySelectorAll<HTMLElement>(':scope > .search-results > .result');
  const list = Array.from(resultElements).map((resultElement): SearchTopicItem => {
    const titleElement = resultElement.querySelector<HTMLAnchorElement>(':scope > h2 > a');
    const link = titleElement?.getAttribute('href') || undefined;
    const nodeElement = resultElement.querySelector<HTMLAnchorElement>('.meta a[href^="/node/"]');
    const authorElement = resultElement.querySelector<HTMLAnchorElement>('.meta a[href^="/u/"]');
    const authorLink = authorElement?.getAttribute('href') || undefined;
    const metaText = getElementText(resultElement, '.meta') || '';
    const isReply = link?.startsWith('/search/reply/') === true;

    return {
      title: highlightSearchKeywords(titleElement, query),
      link,
      topicId: link?.match(/^\/t\/(\d+)/)?.[1],
      replyId: link?.match(/^\/search\/reply\/(\d+)/)?.[1],
      nodeName: nodeElement?.textContent?.trim() || undefined,
      nodeLink: nodeElement?.getAttribute('href') || undefined,
      authorId: authorLink?.match(/^\/u\/(.+)$/)?.[1],
      authorLink,
      createdTime: metaText.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)?.[0],
      matchType: isReply ? SearchResultType.Reply : SearchResultType.Topic,
      excerpt: resultElement.querySelector('.excerpt')?.innerHTML || undefined,
    };
  });

  return {
    query,
    page: Number(statusText.match(/第\s*(\d+)\s*页/)?.[1] || 1),
    elapsedMilliseconds: elapsedMilliseconds === undefined ? undefined : Number(elapsedMilliseconds),
    emptyMessage: getElementText(searchElement, '.empty'),
    notice: getElementText(searchElement, '.notice'),
    previousPage: getSearchPageNumber(previousPageLink),
    nextPage: getSearchPageNumber(nextPageLink),
    list,
  };
};

export const parseSearchNodeOptions = (htmlStr: string): SearchNodeOption[] => {
  const searchDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  const optionElements = searchDocument.querySelectorAll<HTMLOptionElement>('.gzk-search select[name="node"] option');

  return Array.from(optionElements).flatMap((optionElement): SearchNodeOption[] => {
    const value = Number(optionElement.value);
    const label = optionElement.textContent?.trim();

    if (!Number.isInteger(value) || value <= 0 || !label) {
      return [];
    }

    return [{ value, label }];
  });
};

export const parseNodeList = (htmlStr: string): TreeNode[] => {
  const nodeDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  const nodeGroupElements = nodeDocument.querySelectorAll('.nodes-cloud > ul > li');

  return Array.from(nodeGroupElements).map((groupElement): TreeNode => {
    const label = getElementText(groupElement, ':scope > label');
    const children = Array.from(groupElement.querySelectorAll<HTMLAnchorElement>('.nodes > a[href^="/node/"]')).map(
      (nodeElement): TreeNode => {
        const href = nodeElement.getAttribute('href') || '';

        return {
          value: href.slice('/node/'.length),
          label: nodeElement.textContent?.trim(),
        };
      },
    );

    return {
      value: label,
      label,
      children,
    };
  });
};

export const parseBlockedUserList = (htmlStr: string): string[] => {
  const blockedUserDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  const userElements = blockedUserDocument.querySelectorAll<HTMLAnchorElement>('.username a[href^="/u/"]');

  return Array.from(userElements).flatMap((userElement) => {
    const uid = userElement.getAttribute('href')?.match(/^\/u\/(.+)$/)?.[1];
    return uid ? [uid] : [];
  });
};

export const checkAlertInfo = (htmlStr: string): void => {
  const formDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  const formElement = Array.from(formDocument.querySelectorAll('form')).find((element) => {
    return element.querySelector('textarea') && element.querySelector('.alert.alert-danger');
  });
  const alertItems = formElement?.querySelectorAll('.alert.alert-danger > li') || [];

  if (alertItems.length) {
    const alertInfo = Array.from(alertItems)
      .map((item) => item.textContent?.trim())
      .filter((item): item is string => Boolean(item))
      .join('，');
    throw new Error(alertInfo);
  }
};
