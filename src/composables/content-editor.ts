import { ref } from 'vue';

import type ContentEditor from '@/components/ContentEditor.vue';
import type EmojiPicker from '@/components/EmojiPicker.vue';

export const useContentEditor = () => {
  const isAddContent = ref(true);
  const contentEditor = ref<InstanceType<typeof ContentEditor> | null>(null);
  const emojiPicker = ref<InstanceType<typeof EmojiPicker> | null>(null);

  const insertEmoji = (emoji: string) => {
    contentEditor.value?.insertValue(`:${emoji}:`);

    setTimeout(() => {
      contentEditor.value?.focusEditor();
    }, 0);
  };

  const clearContent = () => {
    contentEditor.value?.setValue('');
  };

  return {
    isAddContent,
    contentEditor,
    emojiPicker,
    insertEmoji,
    clearContent,
  };
};
