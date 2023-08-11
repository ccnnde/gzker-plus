<script setup lang="ts">
import { t } from '@/i18n';

interface Props {
  showIcon?: boolean;
  errorText?: string;
}

withDefaults(defineProps<Props>(), {
  showIcon: true,
  errorText: t('common.loadFailed'),
});

defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div :class="{ 'error-container': true, 'error-container-without-icon': !showIcon }">
    <un-i-mdi-close-circle v-show="showIcon" class="error-icon" />
    <span class="error-tip" @click="$emit('retry')">{{ errorText }}</span>
  </div>
</template>

<style lang="scss" scoped>
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.error-container-without-icon {
  height: auto;
}

.error-icon {
  font-size: 40px;
  color: var(--el-color-error);
}

.error-tip {
  align-self: stretch;
  padding: 10px 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  text-align: center;
  cursor: pointer;
}
</style>
