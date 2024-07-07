<script setup lang="ts">
import { ElSelect } from 'element-plus';

import { useEditorPicker } from '@/composables/editor-picker';

import weiboEmojis from '@/assets/weibo-emojis.json';

const emit = defineEmits<{
  picked: [emoji: string];
  hide: [];
}>();

const handleSelect = (emoji: string) => {
  emit('picked', emoji);
};

const handleHide = () => {
  emit('hide');
};

const { select, isPickerVisible, showPicker, handleFocus, handleVisibleChange } = useEditorPicker(
  undefined,
  handleHide,
);

defineExpose({
  showPicker,
});
</script>

<template>
  <ElSelect
    v-show="isPickerVisible"
    ref="select"
    :placeholder="$t('enhancedTopic.selectWeiboEmoji')"
    popper-class="editor-picker-popper"
    filterable
    default-first-option
    @focus="handleFocus"
    @change="handleSelect"
    @visible-change="handleVisibleChange"
  >
    <ElOption v-for="item in weiboEmojis" :key="item.name" :value="item.short_names[0]">
      <img :src="item.imageUrl" />
      :{{ item.short_names[0] }}:
    </ElOption>
  </ElSelect>
</template>
