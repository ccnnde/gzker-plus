import type { UserReplyItem, UserTopic, UserTopicDetail, UserTopicStatus } from '@/types';

const getUserId = (userLink: string | undefined): string | undefined => {
  return userLink?.match(/^\/u\/(.+)$/)?.[1];
};

const parseTopicDetail = (topicDocument: Document): UserTopicDetail => {
  const topicElement = topicDocument.querySelector('.topic-detail');
  const headerElement = topicElement?.querySelector(':scope > .ui-header');
  const authorElement = headerElement?.querySelector<HTMLAnchorElement>(':scope > a[href^="/u/"]');
  const authorLink = authorElement?.getAttribute('href') || undefined;
  const contentElement = topicElement?.querySelector(':scope > .ui-content');
  const editInfoElement = contentElement?.querySelector(':scope > .edit-info');
  const editInfo = editInfoElement?.textContent?.trim();
  const metaElement = headerElement?.querySelector('.meta');
  const tags = Array.from(
    topicElement?.querySelectorAll<HTMLAnchorElement>(':scope > .topic-tags > a.tag-badge') || [],
  ).map((element) => ({
    name: element.textContent?.trim() || '',
    href: element.getAttribute('href') || '',
  }));

  editInfoElement?.remove();

  return {
    title: headerElement?.querySelector('.title')?.innerHTML,
    authorId: getUserId(authorLink),
    authorLink,
    avatarUrl: authorElement?.querySelector<HTMLImageElement>('img.avatar')?.getAttribute('src') || undefined,
    meta: {
      nodeInfo: metaElement?.querySelector('.node')?.innerHTML,
      authorInfo: metaElement?.querySelector('.username')?.innerHTML,
      createdTime: metaElement?.querySelector('.created-time')?.innerHTML,
      lastReplyUser: metaElement?.querySelector('.last-reply-username')?.innerHTML,
      lastReplyTime: metaElement?.querySelector('.last-reply-time')?.innerHTML,
    },
    content: contentElement?.innerHTML,
    editInfo,
    tags,
    liked: topicElement?.querySelector('.J_topicVote')?.getAttribute('data-type') === '',
    likeNumber: topicElement?.querySelector('.up_vote')?.textContent?.match(/(\d+) 人赞/)?.[1],
    favorited: topicElement?.querySelector('.J_topicFavorite')?.getAttribute('data-type') === 'unfavorite',
    favoriteNumber: topicElement?.querySelector('.favorited')?.textContent?.match(/(\d+) 人收藏/)?.[1],
    clickNumber: topicElement?.querySelector('.hits')?.textContent?.match(/(\d+) 次点击/)?.[1],
    editable: Boolean(topicElement?.querySelector('a[href^="/t/edit/"]')),
  };
};

const parseTopicStatus = (topicDocument: Document): UserTopicStatus => {
  const createReplyText = topicDocument.querySelector('.topic-reply-create')?.textContent || '';

  return {
    unbindedPhone: createReplyText.includes('请绑定手机号后，再发言'),
    locked: createReplyText.includes('本帖已锁'),
  };
};

const parseTopicReplyItem = (item: HTMLElement): UserReplyItem => {
  const metaElement = item.querySelector(':scope > .main > .meta');
  const authorElement = metaElement?.querySelector<HTMLAnchorElement>(':scope > a.reply-username');
  const authorLink = authorElement?.getAttribute('href') || undefined;
  const voteElement = metaElement?.querySelector<HTMLAnchorElement>('.J_replyVote');
  const timeElements = Array.from(metaElement?.querySelectorAll<HTMLElement>(':scope > span.time') || []);
  const hasTimeLabel = (label: string) => {
    return timeElements.some((element) => element.textContent?.trim() === label);
  };
  const [replyTimeElement, replyIpElement] = timeElements.filter((element) => {
    const text = element.textContent?.trim();
    return text !== '楼主' && text !== '管理员';
  });
  const voteLink = voteElement?.getAttribute('href');
  const replyId = item.id.match(/^r(\d+)$/)?.[1] || voteLink?.match(/[?&]reply_id=(\d+)/)?.[1];
  const replyNumberText = metaElement?.querySelector(':scope > span.floor:not(.reply-to)')?.textContent;
  const hasAdministratorIcon = Boolean(metaElement?.querySelector('.icon-group[title="管理员"]'));
  const isOriginalPoster = hasTimeLabel('楼主');
  const isAdministrator = hasAdministratorIcon || hasTimeLabel('管理员');

  return {
    uid: getUserId(authorLink),
    userLink: authorLink,
    avatarUrl: item.querySelector<HTMLImageElement>(':scope > a > img.avatar')?.getAttribute('src') || undefined,
    isOriginalPoster,
    isAdministrator,
    replyId,
    replyNo: replyNumberText?.match(/#(\d+)/)?.[1],
    replyTime: replyTimeElement?.textContent?.trim(),
    replyIp: replyIpElement?.textContent?.trim(),
    content: item.querySelector(':scope > .main > .content')?.innerHTML,
    liked: false,
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
