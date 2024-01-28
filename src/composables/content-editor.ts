import { computed, ref } from 'vue';

import type ContentEditor from '@/components/ContentEditor.vue';
import type EmojiPicker from '@/components/EmojiPicker.vue';
import type MentionPicker from '@/components/MentionPicker.vue';
import { addUnit } from '@/utils';

import type { CSSProperties } from 'vue';
import type { Coordinates } from '@/types';

export const useContentEditor = () => {
  const isAddContent = ref(true);
  const contentEditor = ref<InstanceType<typeof ContentEditor> | null>(null);
  const emojiPicker = ref<InstanceType<typeof EmojiPicker> | null>(null);
  const mentionPicker = ref<InstanceType<typeof MentionPicker> | null>(null);
  const mentionPickerLeft = ref(0);
  const mentionPickerTop = ref(0);

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

  const clearContent = () => {
    contentEditor.value?.setValue('');
  };

  const showMentionPicker = (coords: Coordinates) => {
    mentionPickerLeft.value = coords.left;
    mentionPickerTop.value = coords.top;
    mentionPicker.value?.showPicker();
  };

  return {
    isAddContent,
    contentEditor,
    emojiPicker,
    mentionPicker,
    mentionPickerStyle,
    insertUid,
    insertEmoji,
    clearContent,
    showMentionPicker,
  };
};
