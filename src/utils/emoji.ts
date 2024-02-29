import data from 'emoji-mart-vue-fast/data/google.json';
import { EmojiIndex } from 'emoji-mart-vue-fast/src';

import weiboEmojis from '@/assets/weibo-emojis.json';

type WeiboEmojiMarkdownMap = Record<string, string>;

/**
 * 过早客论坛特殊 emoji
 */
const gzkSpecialEmojis = ['dog', 'hsk', 'octocat', 'trollface'];

/**
 * 以微博 emoji 名称为 key，对应 markdown 格式的图片 `![name](url)` 为 value 的映射对象
 */
const weiboEmojiMarkdownMap: WeiboEmojiMarkdownMap = weiboEmojis.reduce<WeiboEmojiMarkdownMap>((acc, emoji) => {
  acc[emoji.name] = `![${emoji.short_names[0]}](${emoji.imageUrl})`;
  return acc;
}, {});

export const NOTO_EMOJI_FONT = 'NotoColorEmoji';

export const EMOJI_CLASS_NAME = 'emoji-type-native';

export const getEmojiById = (emojiId: string): string | null => {
  try {
    const emoji = emojiIndex.emoji(emojiId);

    if (emoji.native) {
      return `<span class="${EMOJI_CLASS_NAME}">${emoji.native}</span>`;
    } else if (emoji.custom) {
      return `<img src="${emoji.imageUrl}" alt="${emojiId}"/>`;
    } else {
      return null;
    }
  } catch (err) {
    console.error(err);
    return null;
  }
};

export const emojiIndex = new EmojiIndex(data, {
  custom: weiboEmojis,
  recent: [
    'wb_doge',
    'wb_二哈',
    'wb_喵喵',
    'wb_笑cry',
    'wb_允悲',
    'wb_苦涩',
    'wb_污',
    'wb_awsl',
    'wb_憧憬',
    'wb_坏笑',
    'wb_笑而不语',
    'wb_偷笑',
    'wb_666',
    'wb_求饶',
    'wb_吃瓜',
    'wb_疑问',
    'wb_并不简单',
    'wb_裂开',
  ],
});

export const convertWeiboEmojiToImg = (content: string): string => {
  const weiboEmojiReg = /:wb_([-a-zA-Z0-9\u4e00-\u9fa5+_]+?):/g;

  return content.replace(weiboEmojiReg, (match: string, emojiName: string) => {
    return weiboEmojiMarkdownMap[emojiName] || match;
  });
};

export const convertWeiboImgToEmoji = (content: string): string => {
  const weiboImgReg = /!\[(wb_([-a-zA-Z0-9\u4e00-\u9fa5+_]+?))\]\(https:\/\/face.t.sinajs.cn\/[\w/]+?\.(png|gif)\)/g;

  return content.replace(weiboImgReg, (match: string, emojiId: string, emojiName: string) => {
    return weiboEmojiMarkdownMap[emojiName] ? `:${emojiId}:` : match;
  });
};

/**
 * 将 html 内容中的 emoji 转换成 native 形式，以使得主题和回复等内容可以显示所有 emoji，且样式统一。当发布的内容含有 emoji 时，存在以下两种情况
 * - 能被识别的 emoji 会被转换成图片，形如 `<img src="/static/emoji/joy.png" height="20" width="20" align="absmiddle"/>`
 * - 不能识别的，保持原样，形如 `:joy:`
 * @param htmlStr html 内容字符串
 */
export const convertEmojiToNative = (htmlStr?: string): string | undefined => {
  const emojiImgReg = '<img src="/static/emoji/(.+?)\\.png" (?:height="20" width="20" )?align="absmiddle"/?>';
  const emojiColonsReg = ':([-a-zA-Z0-9\\u4e00-\\u9fa5+_]+?):';
  const emojiFullReg = new RegExp(`${emojiImgReg}|${emojiColonsReg}`, 'g');

  return htmlStr?.replace(emojiFullReg, (match: string, p1: string, p2: string) => {
    if (gzkSpecialEmojis.includes(p1)) {
      return match;
    }

    const emojiId = p1 || p2;
    const emoji = getEmojiById(emojiId);
    return emoji || match;
  });
};
