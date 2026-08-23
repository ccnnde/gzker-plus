import { SELECTOR_USER_MENTION_LINK, USER_MENTION_CLASS_NAME } from '@/constants/selector';

import type { UserReplyMention } from '@/types';

const EXCLUDED_LINKIFY_CONTAINER_SELECTOR = 'a, pre, code, script, style, textarea';
const EXCLUDED_MENTION_CONTAINER_SELECTOR = 'blockquote, pre, code, script, style, textarea';
const FLOOR_TEXT_REGEXP = /^\s*#(\d+)/;
const HAS_HTTP_LINK_REGEXP = /https?:\/\//i;
const HTTP_LINK_PREFIX_REGEXP = /^https?:\/\//i;
const IMAGE_PATH_REGEXP = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i;
const LINKIFY_TOKEN_REGEXP = /https?:\/\/[^\s<>"'\x60]+|@[\p{L}\p{N}_-]+/giu;
const MENTION_BOUNDARY_CHAR_REGEXP = /[\p{L}\p{N}_-]/u;
const PLAIN_TEXT_MENTION_REGEXP = /(?:^|[^\p{L}\p{N}_-])@([\p{L}\p{N}_-]+)(?:\s+#(\d+))?/gu;
const TRAILING_URL_PUNCTUATION_REGEXP = /[.,!?;:，。！？；：]+$/u;
const USER_LINK_REGEXP = /^\/u\/([^/?#]+)/;
const URL_BRACKET_PAIRS = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['（', '）'],
  ['【', '】'],
] as const;

interface LinkifyReplacement {
  node: Node;
  trailingText: string;
}

const setExternalLinkAttributes = (element: HTMLAnchorElement): void => {
  element.target = '_blank';
  element.relList.add('noopener', 'noreferrer');
};

const createExternalLink = (href: string, text: string): HTMLAnchorElement => {
  const element = document.createElement('a');
  element.setAttribute('href', href);
  element.textContent = text;
  setExternalLinkAttributes(element);

  return element;
};

const countCharacter = (value: string, character: string): number => {
  return [...value].filter((item) => item === character).length;
};

const trimUrlCandidate = (candidate: string): { trailingText: string; url: string } => {
  let url = candidate.replace(TRAILING_URL_PUNCTUATION_REGEXP, '');
  let hasUnmatchedClosingBracket = true;

  while (hasUnmatchedClosingBracket) {
    hasUnmatchedClosingBracket = false;

    for (const [openingBracket, closingBracket] of URL_BRACKET_PAIRS) {
      const openingCount = countCharacter(url, openingBracket);
      const closingCount = countCharacter(url, closingBracket);

      if (url.endsWith(closingBracket) && closingCount > openingCount) {
        url = url.slice(0, -closingBracket.length).replace(TRAILING_URL_PUNCTUATION_REGEXP, '');
        hasUnmatchedClosingBracket = true;
        break;
      }
    }
  }

  return {
    url,
    trailingText: candidate.slice(url.length),
  };
};

const getHttpUrl = (candidate: string): URL | undefined => {
  try {
    const url = new URL(candidate);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined;
    }

    return url;
  } catch {
    return undefined;
  }
};

const getImageFilename = (url: URL): string => {
  const filename = url.pathname.slice(url.pathname.lastIndexOf('/') + 1);

  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
};

const createUrlReplacement = (candidate: string): LinkifyReplacement | undefined => {
  const { trailingText, url: urlText } = trimUrlCandidate(candidate);
  const url = getHttpUrl(urlText);

  if (!url) {
    return undefined;
  }

  if (IMAGE_PATH_REGEXP.test(url.pathname)) {
    const image = document.createElement('img');
    image.setAttribute('src', urlText);
    image.setAttribute('alt', getImageFilename(url));
    image.setAttribute('loading', 'lazy');
    image.setAttribute('decoding', 'async');

    return {
      node: image,
      trailingText,
    };
  }

  return {
    node: createExternalLink(urlText, urlText),
    trailingText,
  };
};

const createMentionReplacement = (candidate: string, previousCharacter: string): LinkifyReplacement | undefined => {
  if (previousCharacter && MENTION_BOUNDARY_CHAR_REGEXP.test(previousCharacter)) {
    return undefined;
  }

  const uid = candidate.slice(1);
  const link = createExternalLink('/u/' + uid, candidate);
  link.classList.add(USER_MENTION_CLASS_NAME);

  return {
    node: link,
    trailingText: '',
  };
};

const createLinkifyReplacement = (candidate: string, previousCharacter: string): LinkifyReplacement | undefined => {
  if (candidate.startsWith('@')) {
    return createMentionReplacement(candidate, previousCharacter);
  }

  return createUrlReplacement(candidate);
};

const replaceTextNodeLinks = (textNode: Text): void => {
  const content = textNode.textContent || '';
  const matches = [...content.matchAll(LINKIFY_TOKEN_REGEXP)];

  if (!matches.length) {
    return;
  }

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  let hasReplacement = false;

  matches.forEach((match) => {
    const matchIndex = match.index ?? 0;
    const candidate = match[0];
    const previousCharacter = content[matchIndex - 1] || '';
    const replacement = createLinkifyReplacement(candidate, previousCharacter);

    fragment.append(content.slice(cursor, matchIndex));

    if (replacement) {
      fragment.append(replacement.node, replacement.trailingText);
      hasReplacement = true;
    } else {
      fragment.append(candidate);
    }

    cursor = matchIndex + candidate.length;
  });

  if (!hasReplacement) {
    return;
  }

  fragment.append(content.slice(cursor));
  textNode.replaceWith(fragment);
};

const normalizeExistingReplyLinks = (container: DocumentFragment): void => {
  const anchorElements = container.querySelectorAll<HTMLAnchorElement>('a[href]');

  anchorElements.forEach((element) => {
    const href = element.getAttribute('href') || '';
    const isMentionLink = element.matches(SELECTOR_USER_MENTION_LINK);
    const isHttpLink = HTTP_LINK_PREFIX_REGEXP.test(href);

    if (isMentionLink || isHttpLink) {
      setExternalLinkAttributes(element);
    }
  });
};

const getLinkifiableTextNodes = (container: DocumentFragment): Text[] => {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    const textNode = currentNode as Text;
    const parentElement = textNode.parentElement;

    if (!parentElement?.closest(EXCLUDED_LINKIFY_CONTAINER_SELECTOR)) {
      textNodes.push(textNode);
    }

    currentNode = walker.nextNode();
  }

  return textNodes;
};

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

const appendReplyMentions = (node: Node, mentions: UserReplyMention[]): void => {
  if (node.nodeType === Node.TEXT_NODE) {
    mentions.push(...parsePlainTextMentions(node.textContent || ''));
    return;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;

    if (element.matches(EXCLUDED_MENTION_CONTAINER_SELECTOR)) {
      return;
    }

    if (element.tagName === 'A') {
      const anchorElement = element as HTMLAnchorElement;

      if (anchorElement.matches(SELECTOR_USER_MENTION_LINK)) {
        const userLink = anchorElement.getAttribute('href') || '';
        const uid = userLink.match(USER_LINK_REGEXP)?.[1];

        if (uid) {
          mentions.push({
            uid,
            floor: getMentionFloor(anchorElement),
          });
        }
      }

      return;
    }
  }

  node.childNodes.forEach((childNode) => {
    appendReplyMentions(childNode, mentions);
  });
};

export const renderReplyContent = (content: string): string => {
  const hasCandidate = content.includes('@') || HAS_HTTP_LINK_REGEXP.test(content);

  if (!content || !hasCandidate) {
    return content;
  }

  const template = document.createElement('template');
  template.innerHTML = content;

  normalizeExistingReplyLinks(template.content);
  getLinkifiableTextNodes(template.content).forEach(replaceTextNodeLinks);

  return template.innerHTML;
};

export const parseReplyMentions = (content?: string): UserReplyMention[] => {
  if (!content?.includes('@')) {
    return [];
  }

  const template = document.createElement('template');
  template.innerHTML = content;

  const mentions: UserReplyMention[] = [];
  appendReplyMentions(template.content, mentions);

  return mentions;
};
