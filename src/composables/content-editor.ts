import { computed, ref } from 'vue';

import type ContentEditor from '@/components/ContentEditor.vue';
import type EmojiPicker from '@/components/EmojiPicker.vue';
import type MentionPicker from '@/components/MentionPicker.vue';
import type WeiboEmojiPicker from '@/components/WeiboEmojiPicker.vue';
import { addUnit, isGlobalLoadingVisible } from '@/utils';

import { useShowPicker } from './show-picker';

import type { CSSProperties } from 'vue';
import type { DialogBeforeCloseFn } from 'element-plus';
import type { Coordinates } from '@/types';

export const useContentEditor = () => {
  const isAddContent = ref(true);
  const contentEditor = ref<InstanceType<typeof ContentEditor> | null>(null);
  const emojiPicker = ref<InstanceType<typeof EmojiPicker> | null>(null);
  const mentionPicker = ref<InstanceType<typeof MentionPicker> | null>(null);
  const mentionPickerLeft = ref(0);
  const mentionPickerTop = ref(0);
  const weiboEmojiPicker = ref<InstanceType<typeof WeiboEmojiPicker> | null>(null);
  const { pickerStyle: weiboEmojiPickerStyle, showPicker: showWeiboEmojiPicker } = useShowPicker(() => {
    weiboEmojiPicker.value?.showPicker();
  });

  const mentionPickerStyle = computed<CSSProperties>(() => {
    return {
      zIndex: 2100,
      position: 'fixed',
      left: addUnit(mentionPickerLeft.value + 1),
      top: addUnit(mentionPickerTop.value - 2),
    };
  });

  const insertUid = (uid: string) => {
    contentEditor.value?.insertValue(`${uid} `);
    contentEditor.value?.focusEditor();
  };

  const insertEmoji = (emoji: string) => {
    contentEditor.value?.insertValue(`:${emoji}:`);
    contentEditor.value?.focusEditor();
  };

  const insertWeiboEmoji = (emoji: string) => {
    contentEditor.value?.insertValue(`${emoji}:`);
    contentEditor.value?.focusEditor();
  };

  const clearContent = () => {
    contentEditor.value?.setValue('');
  };

  const refreshEditor = () => {
    contentEditor.value?.refreshEditor();
    contentEditor.value?.scrollToCursor();
  };

  const resetEditorLayout = () => {
    contentEditor.value?.setEditorLayout('50%', '50%');
  };

  const showMentionPicker = (coords: Coordinates) => {
    mentionPickerLeft.value = coords.left;
    mentionPickerTop.value = coords.top;

    setTimeout(() => {
      mentionPicker.value?.showPicker();
    }, 50);
  };

  const isEmojiPickerVisible = () => {
    if (emojiPicker.value?.visible) {
      emojiPicker.value.hidePicker();
      contentEditor.value?.focusEditor();
      return true;
    }

    return false;
  };

  const handleEditorBeforeClose: DialogBeforeCloseFn = (done) => {
    if (isGlobalLoadingVisible() || isEmojiPickerVisible()) {
      return;
    }

    done();
  };

  return {
    isAddContent,
    contentEditor,
    emojiPicker,
    mentionPicker,
    mentionPickerStyle,
    weiboEmojiPicker,
    weiboEmojiPickerStyle,
    insertUid,
    insertEmoji,
    insertWeiboEmoji,
    clearContent,
    refreshEditor,
    resetEditorLayout,
    showMentionPicker,
    showWeiboEmojiPicker,
    isEmojiPickerVisible,
    handleEditorBeforeClose,
  };
};
