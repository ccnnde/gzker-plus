import { ReplyType } from '@/constants';

import type { TreeNode, UserInfo, UserMessage, UserTopicDetail } from '@/types';

const getElementText = (parent: ParentNode | null, selector: string): string | undefined => {
  return parent?.querySelector(selector)?.textContent?.trim() || undefined;
};

export const parseUserInfo = (htmlStr: string): UserInfo => {
  const userDocument = new DOMParser().parseFromString(htmlStr, 'text/html');
  const profileElement = userDocument.querySelector('.user-page .profile');
  const statisticsElement = userDocument.querySelector('.user-page .usercard');
  const profileText = profileElement?.textContent || '';
  const followed = Array.from(profileElement?.querySelectorAll<HTMLAnchorElement>('a[href^="/f/user/"]') || []).some(
    (element) => element.textContent?.trim() === '取消关注',
  );

  return {
    uid: getElementText(profileElement, '.username'),
    avatarUrl: profileElement?.querySelector<HTMLImageElement>('img.avatar')?.getAttribute('src') || undefined,
    memberNo: profileText.match(/过早客第(\d+)号成员/)?.[1],
    checkInTime: profileText.match(/入住于(\d{4}-\d{2}-\d{2})/)?.[1],
    topicNumber: getElementText(statisticsElement, 'a[href$="/topics"]'),
    replyNumber: getElementText(statisticsElement, 'a[href$="/replies"]'),
    favoriteNumber: getElementText(statisticsElement, 'a[href$="/favorites"]'),
    creditValue: getElementText(statisticsElement, '.status-reputation strong'),
    followed,
    blocked: Boolean(profileElement?.querySelector('a[href$="/unblock"]')),
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
    const userElement = messageElement.querySelector<HTMLAnchorElement>('a[href^="/u/"]');
    const userLink = userElement?.getAttribute('href') || undefined;
    const topicElement = messageElement.querySelector<HTMLAnchorElement>('a[href^="/t/"]');

    return {
      uid: userLink?.match(/^\/u\/(.+)$/)?.[1],
      userLink,
      avatarUrl: userElement?.querySelector<HTMLImageElement>('img.avatar')?.getAttribute('src') || undefined,
      topicTitle: topicElement?.innerHTML,
      topicLink: topicElement?.getAttribute('href') || undefined,
      replyType: messageElement.textContent?.includes('回复了你的主题') ? ReplyType.Topic : ReplyType.Mention,
      replyContent: messageElement.querySelector('.content')?.innerHTML,
    };
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
