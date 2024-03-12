<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue';
import { Picker } from 'emoji-mart-vue-fast/src';
import { runtime } from 'webextension-polyfill';

import { t } from '@/i18n';
import { EMOJI_CLASS_NAME, emojiIndex, NOTO_EMOJI_FONT } from '@/utils/emoji';

import type { CSSProperties } from 'vue';
import type { EmojiObject } from 'emoji-mart-vue-fast/src';
import type { IFontFaceSet } from '@/types';

import 'emoji-mart-vue-fast/css/emoji-mart.css';

const emit = defineEmits<{
  select: [emoji: string];
}>();

const pickerStyle: CSSProperties = {
  height: '380px',
};

const picker = ref<InstanceType<typeof Picker> | null>(null);
const isPickerFirstRender = ref(true);
const isLoading = ref(true);
const visible = ref(false);

const emojiI18n = computed(() => {
  return {
    search: t('emojiPicker.search'),
    notfound: t('emojiPicker.notfound'),
    categories: {
      search: t('emojiPicker.categories.search'),
      recent: t('emojiPicker.categories.recent'),
      smileys: t('emojiPicker.categories.smileys'),
      people: t('emojiPicker.categories.people'),
      nature: t('emojiPicker.categories.nature'),
      foods: t('emojiPicker.categories.foods'),
      activity: t('emojiPicker.categories.activity'),
      places: t('emojiPicker.categories.places'),
      objects: t('emojiPicker.categories.objects'),
      symbols: t('emojiPicker.categories.symbols'),
      flags: t('emojiPicker.categories.flags'),
      custom: t('emojiPicker.categories.custom'),
    },
  };
});

onBeforeMount(() => {
  loadEmojiFont();
});

const loadEmojiFont = () => {
  const isEmojiFontLoaded = getFontFaceList()
    .map((item) => item.family)
    .includes(NOTO_EMOJI_FONT);

  if (isEmojiFontLoaded) {
    return;
  }

  const fontFace = document.createElement('style');
  const emojiFontUrl = runtime.getURL(`font/${NOTO_EMOJI_FONT}.ttf`);

  fontFace.textContent = `
    @font-face {
      font-family: ${NOTO_EMOJI_FONT};
      src: url(${emojiFontUrl});
    }

    span.${EMOJI_CLASS_NAME} {
      font-family: ${NOTO_EMOJI_FONT};
    }
  `;

  document.head.appendChild(fontFace);
};

/**
 * 获取文档已经加载的字体列表
 * - 在 firefox 浏览器中调用 `[...document.fonts.values()]`  会报错 `Uncaught TypeError: document.fonts.values() is not iterable`
 * - 故使用手动迭代的方式获取 `values`，解决方案参考 https://sidneyliebrand.io/blog/fixing-font-face-set-entries-not-iterable-in-firefox
 * - 此 bug 已经存在于 firefox 的 bugzilla，尚未修复，链接如下
 *    - https://bugzilla.mozilla.org/show_bug.cgi?id=1729089
 *    - https://bugzilla.mozilla.org/show_bug.cgi?id=1780657
 */
const getFontFaceList = (): FontFace[] => {
  const fontFaceList: FontFace[] = [];
  const iterator = (document.fonts as IFontFaceSet).values();
  let result = iterator.next();

  while (!result.done) {
    fontFaceList.push(result.value);
    result = iterator.next();
  }

  return fontFaceList;
};

const showPicker = () => {
  visible.value = true;
};

const hidePicker = () => {
  visible.value = false;
};

const handleEmojiSelect = (emoji: EmojiObject) => {
  emit('select', emoji.id);
};

const handlePickerShow = () => {
  if (isPickerFirstRender.value) {
    isPickerFirstRender.value = false;

    setTimeout(() => {
      isLoading.value = false;
    }, 500);
  }
};

const handlePickerHide = () => {
  const emojiPanel = picker.value?.$refs.scroll as HTMLDivElement;
  emojiPanel.scrollTo({ top: 0 });
};

defineExpose({
  visible,
  showPicker,
  hidePicker,
});
</script>

<template>
  <ElPopover
    v-model:visible="visible"
    :width="353"
    :popper-style="{ padding: 0 }"
    :hide-after="0"
    trigger="click"
    @after-enter="handlePickerShow"
    @before-leave="handlePickerHide"
  >
    <template #reference>
      <un-i-mdi-emoticon-happy-outline class="emoji-icon" :title="$t('emojiPicker.emoji')" />
    </template>
    <template #default>
      <div v-loading="isLoading" :style="pickerStyle">
        <Picker
          v-if="!isPickerFirstRender"
          ref="picker"
          :style="pickerStyle"
          :data="emojiIndex"
          set="native"
          native
          color="var(--el-color-primary)"
          emoji="wb_举手"
          :title="$t('emojiPicker.pick')"
          :i18n="emojiI18n"
          :show-skin-tones="false"
          :show-search="false"
          @select="handleEmojiSelect"
        />
      </div>
    </template>
  </ElPopover>
</template>

<style lang="scss">
.emoji-mart {
  border: none;
}

.emoji-mart-bar {
  border-color: var(--el-border-color);
}

.emoji-mart-category {
  .emoji-mart-emoji {
    span {
      cursor: pointer;
    }

    &:hover::before,
    &.emoji-mart-emoji-selected::before {
      background-color: #091e420f;
    }
  }
}
</style>

<style lang="scss" scoped>
.emoji-icon {
  font-size: 25px;
  color: var(--el-text-color-secondary);
  cursor: pointer;

  &:hover {
    color: var(--el-text-color-regular);
  }
}
</style>
