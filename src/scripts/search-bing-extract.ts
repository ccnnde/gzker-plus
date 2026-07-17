import { BING_SEARCH_URL, GZK_URL, IframeMessageType } from '@/constants';
import {
  SELECTOR_BING_CAPTION_DESC,
  SELECTOR_BING_GZK_TITLE_LINK,
  SELECTOR_BING_IMGCAP_DESC,
  SELECTOR_BING_NEXT_PAGE,
  SELECTOR_BING_RESULT_ITEMS,
  SELECTOR_BING_RESULTS,
} from '@/constants/selector';

import type { FetchNextPageMessage, SearchResultItem, SearchResultMessage } from '@/types';

const EXTRACT_TIMEOUT = 3000;
let isGzkFrame = false;

if (window.self !== window.top) {
  const origins = window.location.ancestorOrigins;
  isGzkFrame = origins.length > 0 && origins[0] === GZK_URL;
}

/**
 * 从指定 DOM 根节点提取搜索结果
 * root 可以是 document（iframe 首屏）或 DOMParser 解析出的 Document（fetch 后续页）
 */
const extractResults = (root: ParentNode) => {
  const container = root.querySelector(SELECTOR_BING_RESULTS);

  if (!container) {
    return null;
  }

  const items = root.querySelectorAll(SELECTOR_BING_RESULT_ITEMS);
  const results: SearchResultItem[] = [];

  items.forEach((item) => {
    const titleLink = item.querySelector<HTMLAnchorElement>(SELECTOR_BING_GZK_TITLE_LINK);

    if (!titleLink) {
      return;
    }

    const url = titleLink.href;
    const rawTitle = titleLink.textContent?.trim() || '';
    const title = rawTitle.replace(/\s*-\s*过早客(\s*-\s*guozaoke)?\s*$/, '');
    const captionDesc = item.querySelector(SELECTOR_BING_CAPTION_DESC);
    const imgcapDesc = item.querySelector(SELECTOR_BING_IMGCAP_DESC);
    const descEl = captionDesc || imgcapDesc;
    const description = descEl?.textContent?.trim() || '';

    results.push({ url, title, description });
  });

  const nextPageLink = root.querySelector<HTMLAnchorElement>(SELECTOR_BING_NEXT_PAGE);
  const nextPageUrl = nextPageLink ? new URL(nextPageLink.href, BING_SEARCH_URL).href : null;

  return {
    results,
    nextPageUrl,
  };
};

/**
 * 仅响应来自父页面 guozaoke.com 的 iframe 场景
 * 直接打开 bing 页面时不执行
 */
if (isGzkFrame) {
  const sendResults = () => {
    const data = extractResults(document);
    const message: SearchResultMessage = {
      type: IframeMessageType.GzkSearchResult,
      results: data?.results || [],
      nextPageUrl: data?.nextPageUrl || null,
      pageUrl: window.location.href,
    };

    window.parent.postMessage(message, '*');
  };

  // 第一页：MutationObserver 等待搜索结果加载
  const observer = new MutationObserver(() => {
    const container = document.querySelector(SELECTOR_BING_RESULTS);

    if (container) {
      observer.disconnect();
      sendResults();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  setTimeout(() => {
    observer.disconnect();
    sendResults();
  }, EXTRACT_TIMEOUT);

  // 后续页：通过 postMessage 接收 fetch 请求，直接 fetch URL 拿到最终 HTML
  window.addEventListener('message', async (event: MessageEvent<FetchNextPageMessage>) => {
    if (event.data?.type !== IframeMessageType.GzkFetchNextPage) {
      return;
    }

    const { url } = event.data;

    try {
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const data = extractResults(doc);

      const message: SearchResultMessage = {
        type: IframeMessageType.GzkSearchResult,
        results: data?.results || [],
        nextPageUrl: data?.nextPageUrl || null,
        pageUrl: url,
      };

      window.parent.postMessage(message, '*');
    } catch (err) {
      console.error(err);

      const errorMessage: SearchResultMessage = {
        type: IframeMessageType.GzkSearchResult,
        results: [],
        nextPageUrl: null,
        pageUrl: url,
      };

      window.parent.postMessage(errorMessage, '*');
    }
  });
}
