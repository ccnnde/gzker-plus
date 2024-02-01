import { computed, ref, watch } from 'vue';

import type { CSSProperties } from 'vue';

export const useDialogFullscreen = (toggleFullscreenCallback: () => void) => {
  const dialogFullscreen = ref(false);

  const dialogFullscreenClass = computed(() => {
    return dialogFullscreen.value ? 'editor-dialog-fullscreen' : 'editor-dialog-minscreen';
  });

  const dialogFullscreenStyle = computed<CSSProperties | undefined>(() => {
    if (!dialogFullscreen.value) {
      return;
    }

    return {
      width: '95%',
      height: '95%',
    };
  });

  watch(dialogFullscreen, () => {
    toggleFullscreenCallback();
  });

  const toggleDialogFullscreen = () => {
    dialogFullscreen.value = !dialogFullscreen.value;
  };

  const resetDialogFullscreen = () => {
    dialogFullscreen.value = false;
  };

  return {
    dialogFullscreen,
    dialogFullscreenClass,
    dialogFullscreenStyle,
    toggleDialogFullscreen,
    resetDialogFullscreen,
  };
};
