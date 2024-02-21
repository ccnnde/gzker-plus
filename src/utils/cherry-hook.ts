import Cherry from 'cherry-markdown/dist/cherry-markdown.core';

export const CHERRY_HOOK_AUTO_IMAGE = 'autoImage';

export const autoImageHook = Cherry.createSyntaxHook(CHERRY_HOOK_AUTO_IMAGE, Cherry.constants.HOOKS_TYPE_LIST.SEN, {
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
