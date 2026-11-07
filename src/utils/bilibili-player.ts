import { t } from '@/i18n';
import { GZK_URL } from '@/constants';

const PLAYER_URL = 'https://player.bilibili.com/player.html';
const VIDEO_HOSTS = ['bilibili.com', 'www.bilibili.com', 'm.bilibili.com'];
const VIDEO_PATH = /^\/video\/(BV[0-9A-Za-z]{10}|av[1-9]\d{0,18})(?:\/|\/index_([1-9]\d{0,3})\.html)?$/;
const VIDEO_ID = /^(?:BV[0-9A-Za-z]{10}|av[1-9]\d{0,18})$/;
const SHORT_LINK_PATH = /^\/[a-z\d]{1,32}\/?$/i;
const PLAYER_CLASS = 'gzkp-bilibili-player';
const EXCLUDED_CONTAINER = 'pre, code, textarea, script, style, iframe, [contenteditable="true"]';
const MAX_CACHED_SHORT_LINKS = 100;
const MAX_PLAYERS_PER_CONTAINER = 10;

const shortLinkRequests = new Map<string, Promise<string | undefined>>();
const attemptedHrefs = new WeakMap<HTMLAnchorElement, string>();

const buildPlayerUrl = (videoId: string, params: URLSearchParams, fallbackPart = '1') => {
  const query = new URLSearchParams();

  if (videoId.startsWith('BV')) {
    query.set('bvid', videoId);
  } else {
    query.set('aid', videoId.slice(2));
  }

  const part = params.get('p') || fallbackPart;

  if (/^[1-9]\d{0,3}$/.test(part)) {
    query.set('p', part);
  }

  const startTime = params.get('t') || params.get('start_progress') || '0';

  if (/^\d{1,7}(?:\.\d{1,3})?$/.test(startTime)) {
    query.set('t', String(Math.floor(Number(startTime))));
  }

  query.set('autoplay', '0');
  query.set('poster', '1');

  return `${PLAYER_URL}?${query}`;
};

const fetchShortLinkPlayer = async (shortUrl: string) => {
  const params = new URLSearchParams({ url: shortUrl });
  const endpoint = `${GZK_URL}/api/bilibili/embed?${params}`;

  const response = await fetch(endpoint, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    return undefined;
  }

  const data: { player_url?: unknown } = await response.json();

  if (typeof data?.player_url !== 'string') {
    return undefined;
  }

  const player = new URL(data.player_url);

  if (`${player.origin}${player.pathname}` !== PLAYER_URL) {
    return undefined;
  }

  const videoId = player.searchParams.get('bvid') || `av${player.searchParams.get('aid')}`;

  if (!VIDEO_ID.test(videoId)) {
    return undefined;
  }

  return buildPlayerUrl(videoId, player.searchParams);
};

const resolveShortLink = (shortUrl: string) => {
  const cached = shortLinkRequests.get(shortUrl);

  if (cached) {
    return cached;
  }

  if (shortLinkRequests.size >= MAX_CACHED_SHORT_LINKS) {
    const oldestUrl = shortLinkRequests.keys().next().value;

    if (oldestUrl) {
      shortLinkRequests.delete(oldestUrl);
    }
  }

  const request: Promise<string | undefined> = fetchShortLinkPlayer(shortUrl)
    .catch(() => {
      return undefined;
    })
    .then((playerUrl) => {
      if (!playerUrl && shortLinkRequests.get(shortUrl) === request) {
        shortLinkRequests.delete(shortUrl);
      }

      return playerUrl;
    });

  shortLinkRequests.set(shortUrl, request);
  return request;
};

const parseVideoLink = (href: string) => {
  if (href.length > 2048 || !/^https?:\/\//i.test(href) || /[\s\\]/.test(href)) {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(href);
  } catch {
    return undefined;
  }

  if (url.username || url.password || url.port) {
    return undefined;
  }

  const isShortHost = url.hostname === 'b23.tv';

  if (!isShortHost && !VIDEO_HOSTS.includes(url.hostname)) {
    return undefined;
  }

  const videoPath = isShortHost ? `/video${url.pathname}` : url.pathname;
  const [, videoId, part] = videoPath.match(VIDEO_PATH) ?? [];

  if (videoId) {
    const playerUrl = buildPlayerUrl(videoId, url.searchParams, part);

    return { kind: 'player' as const, url: playerUrl };
  }

  if (isShortHost && SHORT_LINK_PATH.test(url.pathname)) {
    const shortPath = url.pathname.replace(/\/$/, '');

    return { kind: 'short' as const, url: `https://b23.tv${shortPath}` };
  }

  return undefined;
};

const replaceVideoLink = (link: HTMLAnchorElement, root: HTMLElement, playerUrl: string) => {
  const playerCount = root.querySelectorAll(`iframe.${PLAYER_CLASS}`).length;

  if (playerCount >= MAX_PLAYERS_PER_CONTAINER) {
    return false;
  }

  const player = document.createElement('iframe');
  player.className = PLAYER_CLASS;
  player.title = t('enhancedTopic.bilibiliPlayer');
  player.src = playerUrl;
  player.loading = 'lazy';
  player.allowFullscreen = true;
  player.allow = 'fullscreen; picture-in-picture; encrypted-media';
  player.referrerPolicy = 'strict-origin-when-cross-origin';

  link.replaceWith(player);
  return true;
};

export const mountBilibiliPlayers = (root: HTMLElement, onResize?: () => void): void => {
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(async (link) => {
    const href = link.getAttribute('href');

    if (!href || attemptedHrefs.get(link) === href || link.closest(EXCLUDED_CONTAINER)) {
      return;
    }

    const videoLink = parseVideoLink(href);

    if (!videoLink) {
      return;
    }

    // 同一节点的链接解析失败后保留原样，避免每次渲染时重复请求。
    attemptedHrefs.set(link, href);

    const playerUrl = await (videoLink.kind === 'short' ? resolveShortLink(videoLink.url) : videoLink.url);

    if (!playerUrl) {
      return;
    }

    const linkIsCurrent = root.isConnected && root.contains(link) && link.getAttribute('href') === href;

    if (!linkIsCurrent) {
      return;
    }

    if (replaceVideoLink(link, root, playerUrl)) {
      onResize?.();
    }
  });
};
