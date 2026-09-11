import { directive as viewer } from 'v-viewer';
import { browser } from 'wxt/browser';

import { ExtensionMessageType } from '@/constants';

import type { DialogBeforeCloseFn } from 'element-plus';
import type Viewer from 'viewerjs';
import type { ImageViewer } from '@/types';

const VIEWER_CLASS_NAME = 'gzk-app-img-viewer';
const VIEWER_IMAGE_SELECTOR = '.viewer-canvas > img';
const VIEWER_DOWNLOAD_SUCCESS_CLASS_NAME = 'viewer-download-success';
const VIEWER_DOWNLOAD_SUCCESS_DURATION = 1000;
let lastDownloadButton: HTMLElement | undefined;
let downloadSuccessTimer: ReturnType<typeof setTimeout> | undefined;

const downloadViewerImage = (event: Event) => {
  const button = event.currentTarget;

  if (!(button instanceof HTMLElement)) {
    return;
  }

  const viewerElement = button.closest<HTMLElement>(`.${VIEWER_CLASS_NAME}`);
  const image = viewerElement?.querySelector<HTMLImageElement>(VIEWER_IMAGE_SELECTOR);
  const imgUrl = image?.currentSrc || image?.src;

  if (!imgUrl) {
    return;
  }

  lastDownloadButton = button;

  browser.runtime
    .sendMessage({
      msgType: ExtensionMessageType.DownloadImg,
      imgUrl,
    })
    .catch((error) => {
      console.error(error);
    });
};

/**
 * 查看图片
 */
export const vViewer = viewer();

export const showImgViewerDownloadSuccess = () => {
  if (!lastDownloadButton?.isConnected) {
    return;
  }

  const downloadButton = lastDownloadButton;
  downloadButton.classList.add(VIEWER_DOWNLOAD_SUCCESS_CLASS_NAME);

  if (downloadSuccessTimer !== undefined) {
    clearTimeout(downloadSuccessTimer);
  }

  downloadSuccessTimer = setTimeout(() => {
    downloadButton.classList.remove(VIEWER_DOWNLOAD_SUCCESS_CLASS_NAME);
    downloadSuccessTimer = undefined;
  }, VIEWER_DOWNLOAD_SUCCESS_DURATION);
};

export const viewerOptions: Viewer.Options = {
  className: VIEWER_CLASS_NAME,
  navbar: {
    show: false,
    visibleItemCount: 0,
  },
  navigation: true,
  tooltip: false,
  toolbar: {
    zoomIn: true,
    zoomOut: true,
    oneToOne: true,
    reset: true,
    prev: true,
    download: {
      click: downloadViewerImage,
    },
    next: true,
    rotateLeft: true,
    rotateRight: true,
    flipHorizontal: true,
    flipVertical: true,
  },
  transition: {
    hide: false,
    move: false,
    show: false,
    view: false,
  },
  title(this: Viewer) {
    const imageViewer = this as ImageViewer;
    return `${imageViewer.index + 1} / ${imageViewer.length}`;
  },
  filter(image: HTMLImageElement) {
    const { src } = image;
    const isImgGzkStaticRes = src.match(/guozaoke.com\/(\/)?static\/(avatar|emoji)/);
    const isImgSinaExpression = src.includes('face.t.sinajs.cn/t4/appstyle/expression');
    const isImgBaiduExpression = src.includes('img.whzxc.cn/bd');

    if (isImgGzkStaticRes || isImgSinaExpression || isImgBaiduExpression) {
      return false;
    }

    image.style.cursor = 'zoom-in';

    return true;
  },
};

export const isImgViewerVisible = () => {
  const imgViewer = document.querySelector(`.${VIEWER_CLASS_NAME}.viewer-container.viewer-in`);
  return !!imgViewer;
};

/**
 * 按下 ESC 关闭 Dialog 时，判断是否在进行图片预览，若是则不关闭 Dialog
 * @param done 关闭 Dialog 的回调函数
 */
export const handleDialogBeforeClose: DialogBeforeCloseFn = (done) => {
  if (isImgViewerVisible()) {
    return;
  }

  done();
};
