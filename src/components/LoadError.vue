<template>
  <div class="error-container">
    <un-i-mdi-close-circle class="error-icon" />
    <span class="error-tip">{{ $t('common.loadFailed') }}</span>
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

.error-icon {
  margin-bottom: 10px;
  font-size: 40px;
  color: var(--el-color-error);
}

.error-tip {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
</style>
