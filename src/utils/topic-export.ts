import type { UserReplyItem } from '@/types';

const WINDOWS_FORBIDDEN_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f\u007f]/gu;
const FILENAME_EDGE_SEPARATORS = /^[\s.-]+|[\s.-]+$/gu;

interface ReplyWithSortKey {
  reply: UserReplyItem;
  floor: number;
  order: number;
}

export const mergeTopicReplies = (replyPages: readonly UserReplyItem[][]): UserReplyItem[] => {
  const repliesByKey = new Map<string, ReplyWithSortKey>();
  let order = 0;

  replyPages.flat().forEach((reply) => {
    const floor = Number(reply.replyNo);
    const hasValidFloor = Number.isInteger(floor) && floor > 0;
    const key = hasValidFloor ? `floor:${floor}` : reply.replyId ? `id:${reply.replyId}` : `order:${order}`;

    if (!repliesByKey.has(key)) {
      repliesByKey.set(key, {
        reply,
        floor: hasValidFloor ? floor : Number.POSITIVE_INFINITY,
        order,
      });
    }

    order++;
  });

  return [...repliesByKey.values()]
    .sort((left, right) => left.floor - right.floor || left.order - right.order)
    .map(({ reply }) => reply);
};

export const getTopicMarkdownFilename = (title?: string): string | undefined => {
  if (!title?.trim()) {
    return undefined;
  }

  const cleanedTitle = title
    .trim()
    .replace(WINDOWS_FORBIDDEN_FILENAME_CHARACTERS, '-')
    .replace(/[\s-]+/gu, '-')
    .replace(FILENAME_EDGE_SEPARATORS, '');
  const truncatedTitle = [...cleanedTitle].slice(0, 100).join('').replace(FILENAME_EDGE_SEPARATORS, '');

  return truncatedTitle ? `${truncatedTitle}.md` : undefined;
};

export const downloadMarkdownFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
};
