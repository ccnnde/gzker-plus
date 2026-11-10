import { onMounted, onUnmounted } from 'vue';

export const usePopoverTrigger = (close: () => void): ((event: MouseEvent | FocusEvent) => boolean) => {
  let suppressFocus = false;
  let suppressHover = false;
  let pointerX: number | undefined;
  let pointerY: number | undefined;

  const hasPointerMoved = (event: MouseEvent) => {
    return pointerX !== undefined && (event.screenX !== pointerX || event.screenY !== pointerY);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (document.hasFocus() && (pointerX === undefined || hasPointerMoved(event))) {
      suppressHover = false;
    }

    pointerX = event.screenX;
    pointerY = event.screenY;
  };

  const resumeTriggers = () => {
    suppressFocus = false;
    suppressHover = false;
  };

  const handleWindowBlur = () => {
    // Returning to the tab can restore focus or hover without new input.
    suppressFocus = true;
    suppressHover = true;
    close();
  };

  onMounted(() => {
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', resumeTriggers, true);
    window.addEventListener('pointerdown', resumeTriggers, true);
    window.addEventListener('mousemove', handleMouseMove, true);
  });

  onUnmounted(() => {
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('keydown', resumeTriggers, true);
    window.removeEventListener('pointerdown', resumeTriggers, true);
    window.removeEventListener('mousemove', handleMouseMove, true);
  });

  return (event: MouseEvent | FocusEvent) => {
    if (event instanceof MouseEvent) {
      return !suppressHover || (document.hasFocus() && hasPointerMoved(event));
    }

    return !suppressFocus;
  };
};
