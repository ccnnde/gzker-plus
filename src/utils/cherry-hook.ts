import Cherry from 'cherry-markdown/dist/cherry-markdown.core';

import { getEmojiById } from './emoji';

const { SEN } = Cherry.constants.HOOKS_TYPE_LIST;

export const enum CherryHookName {
  Emoji = 'emoji',
  AutoImage = 'autoImage',
  MentionUser = 'mentionUser',
}

export const emojiHook = Cherry.createSyntaxHook(CherryHookName.Emoji, SEN, {
  makeHtml(str: string) {
    if (!this.test(str)) {
      return str;
    }

    return str.replace(this.RULE.reg, (match: string, emojiId: string) => {
      const emoji = getEmojiById(emojiId);
      return emoji || match;
    });
  },
  rule() {
    return {
      reg: /:([-a-zA-Z0-9\u4e00-\u9fa5+_]+?):/g,
    };
  },
});

export const autoImageHook = Cherry.createSyntaxHook(CherryHookName.AutoImage, SEN, {
  makeHtml(str: string) {
    if (!this.test(str)) {
      return str;
    }

    return str.replace(this.RULE.reg, (match: string) => {
      return `<img src="${match}"/>`;
    });
  },
  rule() {
    return {
      reg: /\bhttps?:\/\/\S+?\.(jpg|jpeg|png|gif|bmp|svg|webp)\b/gi,
    };
  },
});

export const mentionUserHook = Cherry.createSyntaxHook(CherryHookName.MentionUser, SEN, {
  makeHtml(str: string) {
    if (!this.test(str)) {
      return str;
    }

    return str.replace(this.RULE.reg, (match: string, uid: string) => {
      return `<a target="_blank" href="/u/${uid}">${match}</a>`;
    });
  },
  rule() {
    return {
      reg: /@([a-z]\w{2,})/gi,
    };
  },
});
