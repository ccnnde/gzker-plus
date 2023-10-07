import type { ObjectDirective } from 'vue';

interface HTMLElementWithRemoveListeners extends HTMLElement {
  __removeListeners__?: () => void;
}

/**
 * html 内容中图片加载完成时执行回调函数
 */
export const vImgLoad: ObjectDirective<HTMLElementWithRemoveListeners, (() => void) | undefined> = {
  mounted(el, { value }) {
    const imgElements = el.querySelectorAll('img');

    const loadHandler = () => {
      value?.();
    };

    const clickHandler = (e: Event) => {
      e.preventDefault();
    };

    imgElements.forEach((element) => {
      element.addEventListener('click', clickHandler);
      element.addEventListener('load', loadHandler);
    });

    el.__removeListeners__ = () => {
      imgElements.forEach((element) => {
        element.removeEventListener('click', clickHandler);
        element.removeEventListener('load', loadHandler);
      });
    };
  },
  beforeUnmount(el) {
    el.__removeListeners__?.();
  },
};
