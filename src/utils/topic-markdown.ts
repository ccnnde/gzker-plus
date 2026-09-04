import { getTopicUrl } from '@/utils';
import { getFirstAnchorInfo, htmlToMarkdown, htmlToPlainText, toAbsoluteUrl } from '@/utils/html-to-markdown';
import { mergeTopicReplies } from '@/utils/topic-export';

import type { TopicMarkdownLabels, UserReplyItem, UserTopic } from '@/types';

const DEFAULT_TOPIC_MARKDOWN_LABELS: TopicMarkdownLabels = {
  author: '作者',
  node: '节点',
  publishedAt: '发布于',
  statistics: '统计',
  exportedAt: '导出时间',
  content: '正文',
  replies: '回复',
  noReplies: '暂无回复',
  views: '次点击',
  replyCount: '条回复',
  favorites: '人收藏',
  thanks: '人感谢',
  originalPoster: '楼主',
  administrator: '管理员',
  replyThanks: '人感谢',
};

interface FormatTopicMetadataOptions {
  topic: UserTopic;
  topicId: string;
  date: Date;
  labels: TopicMarkdownLabels;
}

interface BuildTopicMarkdownOptions {
  topic: UserTopic;
  topicId: string;
  exportedAt?: Date;
  labels?: Partial<TopicMarkdownLabels>;
}

const formatExportTime = (date: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
};

const formatMarkdownLink = (text: string, href?: string): string => {
  if (!text && !href) {
    return '';
  }

  if (!href) {
    return text;
  }

  const escapedText = text.replace(/[\\[\]]/g, '\\$&');
  return `[${escapedText || href}](${href})`;
};

const getMetadataValue = (html?: string, fallback?: string): string => {
  return htmlToPlainText(html) || fallback || '';
};

const getMetadataLink = (html?: string): string | undefined => {
  const anchorInfo = getFirstAnchorInfo(html);
  return toAbsoluteUrl(anchorInfo?.href);
};

const getReplyNumber = (reply: UserReplyItem): number => {
  const replyNumber = Number(reply.replyNo);
  return Number.isInteger(replyNumber) && replyNumber > 0 ? replyNumber : Number.POSITIVE_INFINITY;
};

const escapeMarkdownEmphasis = (content: string): string => {
  return content.replace(/[\\_*]/g, '\\$&');
};

const formatTopicStatistics = (topic: UserTopic, labels: TopicMarkdownLabels): string => {
  const statistics: string[] = [];
  const { detail, reply } = topic;

  if (detail.clickNumber?.trim()) {
    statistics.push(`${detail.clickNumber} ${labels.views}`);
  }

  if (reply.total.trim()) {
    statistics.push(`${reply.total} ${labels.replyCount}`);
  }

  if (detail.favoriteNumber?.trim()) {
    statistics.push(`${detail.favoriteNumber} ${labels.favorites}`);
  }

  if (detail.likeNumber && Number(detail.likeNumber) > 0) {
    statistics.push(`${detail.likeNumber} ${labels.thanks}`);
  }

  return statistics.join(' · ');
};

const formatTopicMetadata = ({ topic, topicId, date, labels }: FormatTopicMetadataOptions): string[] => {
  const { detail } = topic;
  const topicUrl = getTopicUrl(topicId);
  const authorInfo = getFirstAnchorInfo(detail.meta?.authorInfo);
  const authorName = getMetadataValue(detail.meta?.authorInfo, detail.authorId);
  const authorUrl = toAbsoluteUrl(detail.authorLink) || toAbsoluteUrl(authorInfo?.href);
  const nodeInfo = getFirstAnchorInfo(detail.meta?.nodeInfo);
  const nodeName = getMetadataValue(detail.meta?.nodeInfo);
  const nodeUrl = getMetadataLink(detail.meta?.nodeInfo);
  const metadata = [`- 原帖：${formatMarkdownLink(topicUrl, topicUrl)}`];

  if (authorName || authorUrl) {
    metadata.push(`- ${labels.author}：${formatMarkdownLink(authorName, authorUrl)}`);
  }

  if (nodeName || nodeUrl || nodeInfo?.text) {
    metadata.push(`- ${labels.node}：${formatMarkdownLink(nodeName || nodeInfo?.text || '', nodeUrl)}`);
  }

  const publishedAt = getMetadataValue(detail.meta?.createdTime);

  if (publishedAt) {
    metadata.push(`- ${labels.publishedAt}：${publishedAt}`);
  }

  const statistics = formatTopicStatistics(topic, labels);

  if (statistics) {
    metadata.push(`- ${labels.statistics}：${statistics}`);
  }

  metadata.push(`- ${labels.exportedAt}：${formatExportTime(date)}`);

  return metadata;
};

const formatReplyHeader = (reply: UserReplyItem, authorId: string | undefined, labels: TopicMarkdownLabels): string => {
  const replyNumber = getReplyNumber(reply);
  const floor = Number.isFinite(replyNumber) ? `#${replyNumber}` : '#?';
  const userName = reply.uid || '';
  const userLink = toAbsoluteUrl(reply.userLink);
  const markers: string[] = [];

  if (reply.isOriginalPoster || (authorId !== undefined && reply.uid === authorId)) {
    markers.push(labels.originalPoster);
  }

  if (reply.isAdministrator) {
    markers.push(labels.administrator);
  }

  const user = formatMarkdownLink(userName, userLink);
  const suffix = markers.length ? ` · ${markers.join(' · ')}` : '';

  return `**${floor}${user ? ` · ${user}` : ''}${suffix}**`;
};

const formatReply = (reply: UserReplyItem, authorId: string | undefined, labels: TopicMarkdownLabels): string => {
  const metadata: string[] = [];

  if (reply.replyTime?.trim()) {
    metadata.push(reply.replyTime);
  }

  if (reply.replyIp?.trim()) {
    metadata.push(reply.replyIp);
  }

  if (reply.likeNumber && Number(reply.likeNumber) > 0) {
    metadata.push(`${reply.likeNumber} ${labels.replyThanks}`);
  }

  const sections = [formatReplyHeader(reply, authorId, labels)];

  if (metadata.length) {
    sections.push(`_${escapeMarkdownEmphasis(metadata.join(' · '))}_`);
  }

  const content = htmlToMarkdown(reply.content);

  if (content) {
    sections.push(content);
  }

  return sections.join('\n\n');
};

export const buildTopicMarkdown = ({
  topic,
  topicId,
  exportedAt = new Date(),
  labels = {},
}: BuildTopicMarkdownOptions): string => {
  const resolvedLabels = { ...DEFAULT_TOPIC_MARKDOWN_LABELS, ...labels };
  const title = topic.detail.title?.trim() || '';
  const replyCount = topic.reply.total.trim() || String(topic.reply.list.length);
  const replies = mergeTopicReplies([topic.reply.list]).sort(
    (left, right) => getReplyNumber(left) - getReplyNumber(right),
  );
  const sections = [
    `# ${title}`,
    formatTopicMetadata({ topic, topicId, date: exportedAt, labels: resolvedLabels }).join('\n'),
    `## ${resolvedLabels.content}`,
    htmlToMarkdown(topic.detail.content),
    '---',
    `## ${resolvedLabels.replies}（${replyCount}）`,
    replies.length
      ? replies.map((reply) => formatReply(reply, topic.detail.authorId, resolvedLabels)).join('\n\n')
      : resolvedLabels.noReplies,
  ];

  return `${sections.join('\n\n').replace(/\n+$/g, '')}\n`;
};
