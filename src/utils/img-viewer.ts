import { directive as viewer } from 'v-viewer';

import type { DialogBeforeCloseFn } from 'element-plus';
import type Viewer from 'viewerjs';
import type { ImageViewer } from '@/types';

const VIEWER_CLASS_NAME = 'gzk-app-img-viewer';

/**
 * 查看图片
 */
export const vViewer = viewer();

export const viewerOptions: Viewer.Options = {
  className: VIEWER_CLASS_NAME,
  title(this: ImageViewer, image: HTMLImageElement) {
    return `${image.alt} (${this.index + 1}/${this.length})`;
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

/**
 * 按下 ESC 关闭 Dialog 时，判断是否在进行图片预览，若是则不关闭 Dialog
 * @param done 关闭 Dialog 的回调函数
 */
export const handleDialogBeforeClose: DialogBeforeCloseFn = (done) => {
  const imgViewer = document.querySelector(`.${VIEWER_CLASS_NAME}.viewer-container.viewer-in`);

  if (!imgViewer) {
    done();
  }
};
