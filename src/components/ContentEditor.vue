<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Cherry from 'cherry-markdown/dist/cherry-markdown.core';
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus';
import { runtime } from 'webextension-polyfill';

import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { IMG_MAX_NUM, IMG_MAX_SIZE } from '@/api/sm-img';
import { fileToBase64 } from '@/utils';
import { emojiHook } from '@/utils/emoji';
import { ExtensionMessageType, OptionsKey } from '@/constants';

import type { CherryFileUploadHandler, CherryLifecycle } from 'cherry-markdown/types/cherry';
import type { CherryFileUploadStatus, Coordinates, ExtensionMessage, Keybindings } from '@/types';

import 'cherry-markdown/dist/cherry-markdown.css';

interface Props {
  modelValue: string;
  mentionable: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  showEmojiPicker: [];
  showMentionPicker: [coords: Coordinates];
  toggleFullscreen: [];
}>();

const LIGHT_THEME = 'light';
let cherryEditor: Cherry | null = null;
let cmEditor: CodeMirror.Editor | null = null;

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
        emoji: {
          syntaxClass: emojiHook,
          force: true,
        },
        mentionUser: {
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
};

const generateShortcut = (e: KeyboardEvent) => {
  const ctrlStr = e.ctrlKey ? 'ctrl+' : '';
  const shiftStr = e.shiftKey ? 'shift+' : '';
  return ctrlStr + shiftStr + e.key;
};

const keybindings: Keybindings = {
  'ctrl+[': function showEmoji() {
    emit('showEmojiPicker');
  },
  'shift+@': function showMention() {
    if (!props.mentionable) {
      return;
    }

    setTimeout(() => {
      emit('showMentionPicker', cmEditor?.cursorCoords(false, 'window') as Coordinates);
    });
  },
  'ctrl+]': function toggleFullscreen() {
    emit('toggleFullscreen');
  },
  // eslint-disable-next-line func-name-matching
  Backspace: function clearMentionUid(e: KeyboardEvent) {
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
};

const storage = useStorageStore();
const imgFileUploadStatusMap: Map<File, CherryFileUploadStatus> = new Map();
let isApiKeyConfirmShown = false;

const handleImgFileUpload: CherryFileUploadHandler = async (file, callback) => {
  const apiKey = storage.options?.[OptionsKey.SmApiKey].apiKey;

  if (!apiKey) {
    if (isApiKeyConfirmShown) {
      return;
    }

    try {
      isApiKeyConfirmShown = true;

      await ElMessageBox.confirm(t('enhancedTopic.cannotUploadByEmptyApiKey'), t('common.warning'), {
        type: 'warning',
        closeOnClickModal: false,
      });
    } catch (err) {
      console.log(err);
    } finally {
      isApiKeyConfirmShown = false;
    }

    return;
  }

  const isImgFile = /image/i.test(file.type);

  if (!isImgFile) {
    ElMessage.error({
      message: t('enhancedTopic.uploadImgOnly'),
      grouping: true,
    });

    return;
  }

  const imgFileSize = file.size / 1024 / 1024;

  if (imgFileSize > IMG_MAX_SIZE) {
    ElMessage.error({
      message: t('enhancedTopic.uploadImgMaxSize', { size: IMG_MAX_SIZE }),
      grouping: true,
    });

    return;
  }

  if (imgFileUploadStatusMap.size >= IMG_MAX_NUM) {
    ElMessage.error({
      message: t('enhancedTopic.uploadImgMaxNum', { num: IMG_MAX_NUM }),
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

const mentionUserHook = Cherry.createSyntaxHook('mentionUser', Cherry.constants.HOOKS_TYPE_LIST.SEN, {
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

const handleContentChange: CherryLifecycle = (text) => {
  emit('update:modelValue', text);
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
    insertValue('');
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
  const insertAnchor: [number, number] = [lastLineNumber + 1, 0];
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
  <div ref="mdEditorEl" class="content-editor-container"></div>
</template>

<style lang="scss" scoped>
.content-editor-container {
  width: 100%;

  :deep(.cherry) {
    display: flex;
    border: 1px solid var(--el-border-color);
    box-shadow: none;

    .cherry-toolbar {
      padding: 0 5px;
      border-bottom: 1px solid var(--el-border-color);
      box-shadow: none;
    }

    .cherry-editor {
      /* stylelint-disable-next-line selector-class-pattern */
      .CodeMirror-lines {
        padding: 15px;
      }
    }

    .cherry-previewer {
      padding: 15px;

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
}
</style>
