<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Cherry from 'cherry-markdown/dist/cherry-markdown.core';
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus';
import { runtime } from 'webextension-polyfill';

import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { IMG_MAX_NUM, IMG_MAX_SIZE } from '@/api/sm-img';
import { fileToBase64 } from '@/utils';
import { autoImageHook, CherryHookName, emojiHook, mentionUserHook } from '@/utils/cherry-hook';
import { ExtensionMessageType, OptionsKey } from '@/constants';
import {
  SHORTCUT_CLEAR_MENTION_UID,
  SHORTCUT_SHOW_EMOJI_PICKER,
  SHORTCUT_SHOW_MENTION_PICKER,
  SHORTCUT_TOGGLE_FULLSCREEN,
  SHORTCUT_TOGGLE_PREVIEW,
} from '@/constants/shortcut';

import type { CherryFileUploadHandler, CherryLifecycle } from 'cherry-markdown/types/cherry';
import type { CherryAnchor, CherryFileUploadStatus, Coordinates, ExtensionMessage, Keybindings } from '@/types';

import 'cherry-markdown/dist/cherry-markdown.css';

interface Props {
  modelValue: string;
  mentionable: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
  change: [];
  showEmojiPicker: [];
  showMentionPicker: [coords: Coordinates];
  toggleFullscreen: [];
}>();

const LIGHT_THEME = 'light';
let cherryEditor: Cherry | null = null;
let cmEditor: CodeMirror.Editor | null = null;

const isEditorFocused = ref(false);
const mdEditorEl = ref<HTMLDivElement | undefined>(undefined);

onMounted(() => {
  initCherryMarkdown();
});

const initCherryMarkdown = () => {
  cherryEditor = new Cherry({
    el: mdEditorEl.value,
    value: props.modelValue,
    fileUpload: handleImgFileUpload,
    toolbars: {
      toolbar: [
        'header',
        'bold',
        'italic',
        'strikethrough',
        'quote',
        '|',
        'ol',
        'ul',
        'checklist',
        'table',
        'hr',
        '|',
        'image',
        'link',
        'code',
      ],
      toolbarRight: ['dialogFullscreen', 'togglePreview'],
      bubble: ['bold', 'italic', 'strikethrough', 'quote'],
      float: false,
      sidebar: false,
      theme: LIGHT_THEME,
      customMenu: {
        dialogFullscreen: Cherry.createMenuHook('对话框全屏', {
          iconName: 'dialog-fullscreen',
          onClick() {
            emit('toggleFullscreen');
          },
        }),
      },
    },
    callback: {
      afterChange: handleContentChange,
      afterInit: () => {},
      beforeImageMounted: (srcProp, src) => ({ srcProp, src }),
      onClickPreview: () => {},
      onCopyCode: () => false,
      changeString2Pinyin: () => '',
    },
    engine: {
      syntax: {
        link: {
          target: '_blank',
        },
        autoLink: {
          target: '_blank',
          enableShortLink: false,
        },
        header: {
          anchorStyle: 'none',
        },
        codeBlock: {
          copyCode: false,
          editCode: false,
          changeLang: false,
        },
        mathBlock: false,
        inlineMath: false,
        toc: false,
        detail: false,
        panel: false,
        bgColor: false,
        fontColor: false,
        fontSize: false,
        sub: false,
        sup: false,
        ruby: false,
        underline: false,
        suggester: false,
      },
      customSyntax: {
        [CherryHookName.Emoji]: {
          syntaxClass: emojiHook,
          force: true,
        },
        [CherryHookName.AutoImage]: {
          syntaxClass: autoImageHook,
          before: 'autoLink',
        },
        [CherryHookName.MentionUser]: {
          syntaxClass: mentionUserHook,
          before: 'bgColor',
        },
      },
    },
  });

  cherryEditor.setTheme(LIGHT_THEME);
  cmEditor = cherryEditor.editor.editor;

  cmEditor.on('keydown', (editor, e) => {
    const shortcut = generateShortcut(e);
    keybindings[shortcut]?.(e);
  });

  cmEditor.on('focus', () => {
    isEditorFocused.value = true;
  });

  cmEditor.on('blur', () => {
    isEditorFocused.value = false;
    emit('blur');
  });
};

const generateShortcut = (e: KeyboardEvent) => {
  const ctrlStr = e.ctrlKey ? 'ctrl+' : '';
  const shiftStr = e.shiftKey ? 'shift+' : '';
  return ctrlStr + shiftStr + e.key;
};

const keybindings: Keybindings = {
  [SHORTCUT_SHOW_EMOJI_PICKER]: () => {
    emit('showEmojiPicker');
  },
  [SHORTCUT_SHOW_MENTION_PICKER]: () => {
    if (!props.mentionable) {
      return;
    }

    setTimeout(() => {
      emit('showMentionPicker', cmEditor?.cursorCoords(false, 'window') as Coordinates);
    });
  },
  [SHORTCUT_CLEAR_MENTION_UID]: (e: KeyboardEvent) => {
    if (!cmEditor) {
      return;
    }

    const cursor = cmEditor.getCursor();
    const { line, ch } = cursor;
    const currentLineContent = cmEditor.getLine(line);
    const beforeCursorContent = currentLineContent.substring(0, ch);
    const afterCursorChar = currentLineContent.substring(ch, ch + 1);
    const mentionUidMatch = beforeCursorContent.match(/@[a-z]\w{2,}$/i);
    const isAfterCursorCharEmpty = afterCursorChar === '' || afterCursorChar === ' ';

    if (mentionUidMatch && isAfterCursorCharEmpty) {
      const start: CodeMirror.Position = {
        line,
        ch: ch - mentionUidMatch[0].length,
      };

      cmEditor.replaceRange('', start, cursor);
      e.preventDefault();
    }
  },
  [SHORTCUT_TOGGLE_PREVIEW]: () => {
    cherryEditor?.toolbar.menus.hooks.togglePreview.onClick();
  },
  [SHORTCUT_TOGGLE_FULLSCREEN]: () => {
    emit('toggleFullscreen');
  },
};

const imgFileUploadStatusMap: Map<File, CherryFileUploadStatus> = new Map();

const handleImgFileUpload: CherryFileUploadHandler = async (file, callback) => {
  const apiKey = await getApiKey();

  if (!apiKey) {
    return;
  }

  const errMsg = validateImgFile(file);

  if (errMsg) {
    ElMessage.error({
      message: errMsg,
      grouping: true,
    });

    return;
  }

  imgFileUploadStatusMap.set(file, { done: false });

  const loading = ElLoading.service({
    text: t('enhancedTopic.uploading'),
    background: 'rgba(0, 0, 0, 0.7)',
  });

  try {
    const msg: ExtensionMessage = {
      msgType: ExtensionMessageType.UploadImg,
      imgFile: {
        name: file.name,
        type: file.type,
        base64Str: await fileToBase64(file),
      },
      apiKey,
    };

    const imgUrl = await runtime.sendMessage(msg);
    const uploadStatus = imgFileUploadStatusMap.get(file) as CherryFileUploadStatus;
    uploadStatus.uploadedCallback = () => callback(imgUrl);
  } catch (err) {
    ElMessage.error({
      message: t('enhancedTopic.uploadFailed'),
      grouping: true,
    });

    console.error(err);
  } finally {
    const uploadStatus = imgFileUploadStatusMap.get(file) as CherryFileUploadStatus;
    uploadStatus.done = true;

    const uploadedFileNum = [...imgFileUploadStatusMap.values()].filter((item) => item.done).length;

    if (uploadedFileNum === imgFileUploadStatusMap.size) {
      imgFileUploadStatusMap.forEach((item) => item.uploadedCallback?.());
      imgFileUploadStatusMap.clear();
      loading.close();
    }
  }
};

const storage = useStorageStore();
let isApiKeyConfirmShown = false;

const getApiKey = async (): Promise<string | undefined> => {
  const apiKey = storage.options?.[OptionsKey.SmApiKey].apiKey;

  if (apiKey || isApiKeyConfirmShown) {
    return apiKey;
  }

  try {
    isApiKeyConfirmShown = true;

    await ElMessageBox.confirm(t('enhancedTopic.cannotUploadByEmptyApiKey'), t('common.warning'), {
      type: 'warning',
      closeOnClickModal: false,
    });
  } catch {
    ElMessage(t('common.canceled'));
  } finally {
    isApiKeyConfirmShown = false;
  }

  return apiKey;
};

const validateImgFile = (file: File): string => {
  const isImgFile = /image/i.test(file.type);

  if (!isImgFile) {
    return t('enhancedTopic.uploadImgOnly');
  }

  const imgFileSize = file.size / 1024 / 1024;

  if (imgFileSize > IMG_MAX_SIZE) {
    return t('enhancedTopic.uploadImgMaxSize', { size: IMG_MAX_SIZE });
  }

  if (imgFileUploadStatusMap.size >= IMG_MAX_NUM) {
    return t('enhancedTopic.uploadImgMaxNum', { num: IMG_MAX_NUM });
  }

  return '';
};

const handleContentChange: CherryLifecycle = (text) => {
  emit('update:modelValue', text);
  emit('change');
};

const focusEditor = () => {
  setTimeout(() => {
    cmEditor?.focus();
  });
};

const focusEndOfEditor = () => {
  cmEditor?.focus();
  cmEditor?.setCursor(cmEditor.lastLine(), 99999);
};

const refreshEditor = () => {
  setTimeout(() => {
    cmEditor?.refresh();
  });
};

const setEditorLayout = (editorPercentage: string, previewerPercentage: string) => {
  cherryEditor?.previewer.setRealLayout(editorPercentage, previewerPercentage);
};

const scrollToCursor = () => {
  setTimeout(() => {
    if (!cmEditor) {
      return;
    }

    const cursor = cmEditor.getCursor();
    const insertAnchor: CherryAnchor = [cursor.line, 99999];
    cherryEditor?.insertValue('', false, insertAnchor, false);
    cmEditor.setCursor(cursor);
  });
};

const setValue = (content: string) => {
  cherryEditor?.setValue(content);
};

const insertValue = (content: string) => {
  cherryEditor?.insertValue(content);
};

const appendValue = (content: string) => {
  const lastLineNumber = cmEditor?.lastLine() || 0;
  const insertAnchor: CherryAnchor = [lastLineNumber + 1, 0];
  cherryEditor?.insertValue(content, false, insertAnchor, false);
};

defineExpose({
  focusEditor,
  focusEndOfEditor,
  refreshEditor,
  setEditorLayout,
  scrollToCursor,
  setValue,
  insertValue,
  appendValue,
});
</script>

<template>
  <div ref="mdEditorEl" :class="['content-editor-container', { 'is-focus': isEditorFocused }]"></div>
</template>

<style lang="scss" scoped>
.content-editor-container {
  width: 100%;

  :deep(.cherry) {
    display: flex;
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
    box-shadow: none;

    .cherry-toolbar {
      padding: 0 5px;
      border-bottom: 1px solid var(--el-border-color);
      border-top-left-radius: var(--el-border-radius-base);
      border-top-right-radius: var(--el-border-radius-base);
      box-shadow: none;
    }

    .cherry-editor {
      border-bottom-right-radius: var(--el-border-radius-base);
      border-bottom-left-radius: var(--el-border-radius-base);

      /* stylelint-disable-next-line selector-class-pattern */
      .CodeMirror-lines {
        padding: 15px;
      }
    }

    .cherry-previewer {
      padding: 15px;
      border-bottom-right-radius: var(--el-border-radius-base);
      border-bottom-left-radius: var(--el-border-radius-base);

      img {
        max-width: 100%;
        pointer-events: none;
      }
    }

    .cherry-markdown {
      a[target='_blank']::after {
        display: none;
      }
    }
  }

  &:hover :deep(.cherry) {
    border-color: var(--el-border-color-hover);
  }

  &.is-focus :deep(.cherry) {
    border-color: var(--el-color-primary);
  }
}
</style>
