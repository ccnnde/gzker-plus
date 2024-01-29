<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Cherry from 'cherry-markdown/dist/cherry-markdown.core';

import { addUnit } from '@/utils';
import { emojiHook } from '@/utils/emoji';

import type { CSSProperties } from 'vue';
import type { CherryLifecycle } from 'cherry-markdown/types/cherry';
import type { Coordinates, Keybindings } from '@/types';

import 'cherry-markdown/dist/cherry-markdown.css';

interface Props {
  modelValue: string;
  height: number;
  mentionable: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  showEmojiPicker: [];
  showMentionPicker: [coords: Coordinates];
}>();

const LIGHT_THEME = 'light';
let cherryEditor: Cherry | null = null;
let cmEditor: CodeMirror.Editor | null = null;

const mdEditorEl = ref<HTMLDivElement | undefined>(undefined);

const editorStyle = computed<CSSProperties>(() => {
  const height = addUnit(props.height);

  return {
    height,
  };
});

onMounted(() => {
  initCherryMarkdown();
});

const initCherryMarkdown = () => {
  cherryEditor = new Cherry({
    el: mdEditorEl.value,
    value: props.modelValue,
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
      toolbarRight: ['fullScreen', 'togglePreview'],
      bubble: ['bold', 'italic', 'strikethrough', 'quote'],
      float: false,
      sidebar: false,
      theme: LIGHT_THEME,
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
  setValue,
  insertValue,
  appendValue,
});
</script>

<template>
  <div ref="mdEditorEl" class="content-editor-container" :style="editorStyle"></div>
</template>

<style lang="scss" scoped>
.content-editor-container {
  width: 100%;
  height: 100%;

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
