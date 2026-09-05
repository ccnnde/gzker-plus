import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

import { GZK_URL } from '@/constants';

import { convertEmojiToNative } from './emoji';

const SKIPPED_TAGS = ['script', 'style', 'template', 'noscript'] as const;

interface AnchorInfo {
  text: string;
  href: string;
}

const normalizeText = (text: string): string => {
  return text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
};

const getAbsoluteUrl = (value: string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value, GZK_URL).href;
  } catch {
    return undefined;
  }
};

const parseHtml = (html: string): HTMLElement => {
  const normalizedHtml = convertEmojiToNative(html) || '';
  const parsedDocument = new DOMParser().parseFromString(normalizedHtml, 'text/html');
  return parsedDocument.body;
};

const absolutizeResourceLinks = (container: HTMLElement) => {
  container.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = getAbsoluteUrl(anchor.getAttribute('href'));

    if (href) {
      anchor.setAttribute('href', href);
    }
  });

  container.querySelectorAll<HTMLImageElement>('img[src]').forEach((image) => {
    const src = getAbsoluteUrl(image.getAttribute('src'));

    if (src) {
      image.setAttribute('src', src);
    }
  });
};

const createTurndownService = (): TurndownService => {
  const service = new TurndownService({
    bulletListMarker: '-',
    br: '  \n',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    fence: '```',
    headingStyle: 'atx',
    preformattedCode: true,
    strongDelimiter: '**',
  });

  service.use(gfm);
  service.addRule('tableCellBreak', {
    filter: (node) => node.nodeName === 'BR' && node.closest('td, th') !== null,
    replacement: () => '<br>',
  });
  service.addRule('hardBreak', {
    filter: (node) => node.nodeName === 'BR' && node.closest('td, th') === null,
    replacement: () => '  \n',
  });
  service.addRule('doubleTildeStrikethrough', {
    filter: (node) => ['DEL', 'S', 'STRIKE'].includes(node.nodeName),
    replacement: (content) => `~~${content}~~`,
  });
  service.remove([...SKIPPED_TAGS] as unknown as TurndownService.Filter);

  return service;
};

const normalizeMarkdownLine = (line: string): string => {
  const hasHardBreak = / {2,}$/u.test(line);
  const normalizedLine = line.replace(/[ \t]+$/gu, '');

  return hasHardBreak ? `${normalizedLine}  ` : normalizedLine;
};

const normalizeMarkdown = (content: string): string => {
  const lines = normalizeText(content).split('\n');
  const normalizedLines: string[] = [];
  let blankLineCount = 0;
  let inCodeBlock = false;

  lines.forEach((line) => {
    const isFence = /^\s*`{3,}/.test(line);

    if (isFence) {
      inCodeBlock = !inCodeBlock;
    }

    if (!inCodeBlock && line.trim() === '') {
      blankLineCount++;

      if (blankLineCount <= 2) {
        normalizedLines.push('');
      }

      return;
    }

    blankLineCount = 0;
    normalizedLines.push(inCodeBlock ? line : normalizeMarkdownLine(line));
  });

  return normalizedLines.join('\n').replace(/^\n+|\n+$/g, '');
};

export const htmlToMarkdown = (html?: string): string => {
  if (!html) {
    return '';
  }

  const container = parseHtml(html);
  absolutizeResourceLinks(container);

  return normalizeMarkdown(createTurndownService().turndown(container));
};

export const htmlToPlainText = (html?: string): string => {
  if (!html) {
    return '';
  }

  const container = parseHtml(html);
  return normalizeText(container.textContent || '')
    .replace(/\s+/gu, ' ')
    .trim();
};

export const getFirstAnchorInfo = (html?: string): AnchorInfo | undefined => {
  if (!html) {
    return undefined;
  }

  const anchor = parseHtml(html).querySelector<HTMLAnchorElement>('a[href]');

  if (!anchor) {
    return undefined;
  }

  return {
    text: normalizeText(anchor.textContent || '')
      .replace(/\s+/gu, ' ')
      .trim(),
    href: anchor.getAttribute('href') || '',
  };
};

export const toAbsoluteUrl = (value: string | undefined): string | undefined => {
  return getAbsoluteUrl(value);
};
