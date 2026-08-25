import type { ObjectDirective } from 'vue';

interface HTMLElementWithRemoveListeners extends HTMLElement {
  __removeListeners__?: () => void;
}

const setupImgListeners = (el: HTMLElementWithRemoveListeners, callback: (() => void) | undefined) => {
  el.__removeListeners__?.();

  const imgElements = el.querySelectorAll('img');

  const loadHandler = () => {
    callback?.();
  };

  const clickHandler = (event: Event) => {
    event.preventDefault();
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
};

/**
 * html 内容中图片加载完成时执行回调函数
 */
export const vImgLoad: ObjectDirective<HTMLElementWithRemoveListeners, (() => void) | undefined> = {
  mounted(el, { value }) {
    setupImgListeners(el, value);
  },
  updated(el, { value }) {
    setupImgListeners(el, value);
  },
  beforeUnmount(el) {
    el.__removeListeners__?.();
  },
};
