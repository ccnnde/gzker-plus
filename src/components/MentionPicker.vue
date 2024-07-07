<script setup lang="ts">
import { ElSelect } from 'element-plus';

import { useEditorPicker } from '@/composables/editor-picker';

interface Props {
  uidList: string[];
}

defineProps<Props>();

const emit = defineEmits<{
  picked: [uid: string];
  hide: [];
}>();

const handleSelect = (uid: string) => {
  emit('picked', uid);
};

const handleHide = () => {
  emit('hide');
};

const { select, isPickerVisible, showPicker, handleFocus, handleVisibleChange } = useEditorPicker(
  handleSelect,
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
    :placeholder="$t('enhancedTopic.mentionWho')"
    popper-class="editor-picker-popper"
    filterable
    allow-create
    default-first-option
    @focus="handleFocus"
    @change="handleSelect"
    @visible-change="handleVisibleChange"
  >
    <ElOption v-for="item in uidList" :key="item" :value="item" />
  </ElSelect>
</template>
