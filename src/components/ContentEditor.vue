<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Cherry from 'cherry-markdown/dist/cherry-markdown.core';
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus';
import { runtime } from 'webextension-polyfill';

import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { IMG_MAX_NUM, IMG_MAX_SIZE } from '@/api/sm-img';
import { checkMacOS, fileToBase64 } from '@/utils';
import { autoImageHook, CherryHookName, emojiHook, mentionUserHook } from '@/utils/cherry-hook';
import type { EditHistoryType } from '@/utils/edit-history';
import {
  ExtensionMessageType,
  LOADING_BACKGROUND_DARK,
  OptionsKey,
  OptionsRouteNames,
  OptionsRoutePaths,
} from '@/constants';
import {
  SHORTCUT_CLEAR_MENTION_UID,
  SHORTCUT_SHOW_EDITOR_HELP,
  SHORTCUT_SHOW_EDITOR_HISTORY,
  SHORTCUT_SHOW_EMOJI_PICKER,
  SHORTCUT_SHOW_MENTION_PICKER,
  SHORTCUT_SUBMIT_CONTENT,
  SHORTCUT_TOGGLE_FULLSCREEN,
  SHORTCUT_TOGGLE_PREVIEW,
} from '@/constants/shortcut';

import EditorHelp from './EditorHelp.vue';
import EditorHistory from './EditorHistory.vue';

import type { CherryFileUploadHandler, CherryLifecycle } from 'cherry-markdown/types/cherry';
import type {
  CherryAnchor,
  CherryFileUploadStatus,
  Coordinates,
  EditHistoryItem,
  ExtensionMessage,
  Keybindings,
} from '@/types';

import 'cherry-markdown/dist/cherry-markdown.css';

interface Props {
  modelValue: string;
  mentionable: boolean;
  editorHistoryType: EditHistoryType;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  blur: [];
  change: [];
  importHistory: [data: EditHistoryItem];
  submitContent: [];
  showEmojiPicker: [];
  showMentionPicker: [coords: Coordinates];
  toggleFullscreen: [];
}>();

const LIGHT_THEME = 'light';
let cherryEditor: Cherry | null = null;
let cmEditor: CodeMirror.Editor | null = null;
let isEditorFirstRender = true;

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
        'bold',
        'italic',
        'strikethrough',
        'header',
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
        'history',
        'help',
      ],
      toolbarRight: ['dialogFullscreen', 'togglePreview'],
      bubble: ['bold', 'italic', 'strikethrough', 'quote'],
      float: false,
      sidebar: false,
      theme: LIGHT_THEME,
      customMenu: {
        history: Cherry.createMenuHook(t('enhancedTopic.editorHistory'), {
          iconName: 'insertSeq',
          onClick: () => openEditorHistory(),
        }),
        help: Cherry.createMenuHook(t('enhancedTopic.editorHelp'), {
          iconName: 'question',
          onClick: () => openEditorHelp(),
        }),
        dialogFullscreen: Cherry.createMenuHook(t('enhancedTopic.dialogFullscreen'), {
          iconName: 'dialog-fullscreen',
          onClick: () => toggleEditorFullscreen(),
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

const isMacOS = checkMacOS();

const generateShortcut = (e: KeyboardEvent) => {
  const ctrlStr = e.ctrlKey ? 'ctrl+' : '';
  const metaStr = e.metaKey && isMacOS ? 'ctrl+' : '';
  const shiftStr = e.shiftKey ? 'shift+' : '';
  const keyStr = e.key && e.key.toLowerCase() !== 'shift' ? e.key.toLowerCase() : '';
  return ctrlStr + metaStr + shiftStr + keyStr;
};

const editorHistory = ref<InstanceType<typeof EditorHistory> | null>(null);

const openEditorHistory = (e?: KeyboardEvent) => {
  // 内容输入时对历史记录的存储操作进行了防抖处理，为了保持打开历史记录时查询的内容和输入的一致，故延时打开
  setTimeout(() => {
    editorHistory.value?.openDialog();
  }, 200);

  e?.preventDefault();
};

const editorHelp = ref<InstanceType<typeof EditorHelp> | null>(null);

const openEditorHelp = (e?: KeyboardEvent) => {
  editorHelp.value?.openDialog();
  e?.preventDefault();
};

const toggleEditorFullscreen = (e?: KeyboardEvent) => {
  emit('toggleFullscreen');
  e?.preventDefault();
};

const keybindings: Keybindings = {
  [SHORTCUT_SHOW_EDITOR_HISTORY]: openEditorHistory,
  [SHORTCUT_SHOW_EDITOR_HELP]: openEditorHelp,
  [SHORTCUT_SHOW_EMOJI_PICKER]: (e: KeyboardEvent) => {
    emit('showEmojiPicker');
    e.preventDefault();
  },
  [SHORTCUT_SHOW_MENTION_PICKER]: () => {
    if (!props.mentionable) {
      return;
    }

    setTimeout(() => {
      emit('showMentionPicker', cmEditor?.cursorCoords(false, 'window') as Coordinates);
    }, 50);
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
  [SHORTCUT_TOGGLE_FULLSCREEN]: toggleEditorFullscreen,
  [SHORTCUT_SUBMIT_CONTENT]: (e: KeyboardEvent) => {
    emit('submitContent');
    e.preventDefault();
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
    background: LOADING_BACKGROUND_DARK,
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
      autofocus: false,
      closeOnClickModal: false,
    });

    const msg: ExtensionMessage = {
      msgType: ExtensionMessageType.OpenOptionsPage,
      extPagePath: OptionsRoutePaths[OptionsRouteNames.ImageHosting],
    };

    runtime.sendMessage(msg);
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

  if (isEditorFirstRender) {
    isEditorFirstRender = false;
    return;
  }

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

/**
 * 重置滚动条位置
 * - 导入或编辑内容时，若上次编辑的滚动条位置有过变化（比如位于中间），则这次打开时仍然在该位置，但实际上滚动条应该位于顶部
 */
const resetScrollbarPosition = () => {
  const verticalScrollbarEle = cmEditor?.getWrapperElement().querySelector('.CodeMirror-vscrollbar');

  if (verticalScrollbarEle) {
    verticalScrollbarEle.scrollTop = 0;
  }
};

const setValue = (content: string) => {
  cherryEditor?.setValue(content);
  resetScrollbarPosition();
};

const insertValue = (content: string) => {
  cherryEditor?.insertValue(content);
};

const appendValue = (content: string) => {
  const lastLineNumber = cmEditor?.lastLine() || 0;
  const insertAnchor: CherryAnchor = [lastLineNumber + 1, 0];
  cherryEditor?.insertValue(content, false, insertAnchor, false);
};

const hideAllSubMenu = () => {
  cherryEditor?.toolbar.hideAllSubMenu();
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
  hideAllSubMenu,
});
</script>

<template>
  <div ref="mdEditorEl" :class="['content-editor-container', { 'is-focus': isEditorFocused }]"></div>
  <EditorHistory
    ref="editorHistory"
    :editor-history-type="editorHistoryType"
    @import-history="$emit('importHistory', $event)"
  />
  <EditorHelp ref="editorHelp" />
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
