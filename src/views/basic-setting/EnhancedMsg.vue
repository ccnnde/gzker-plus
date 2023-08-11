<script setup lang="ts">
import { BellStyle, OptionsKey } from '@/constants';

import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.EnhancedMsg>>();
</script>

<template>
  <ElRadioGroup v-model="settings.bellStyle" class="bell-style-radio-group">
    <ElRadioButton :label="BellStyle.None">
      <div class="bell-style-radio-content">
        <un-i-mdi-bell-off-outline class="bell-icon" />
        <span>{{ $t('basicSetting.enhancedMsg.bellNone') }}</span>
      </div>
    </ElRadioButton>
    <ElRadioButton :label="BellStyle.Normal">
      <div class="bell-style-radio-content">
        <un-i-mdi-bell-outline class="bell-icon" />
        <span>{{ $t('basicSetting.enhancedMsg.bellNormal') }}</span>
      </div>
    </ElRadioButton>
    <ElRadioButton :label="BellStyle.BadgeDot">
      <div class="bell-style-radio-content">
        <ElBadge is-dot>
          <un-i-mdi-bell-outline class="bell-icon" />
        </ElBadge>
        <span>{{ $t('basicSetting.enhancedMsg.bellDot') }}</span>
      </div>
    </ElRadioButton>
    <ElRadioButton :label="BellStyle.BadgeNum">
      <div class="bell-style-radio-content">
        <ElBadge :value="1">
          <un-i-mdi-bell-outline class="bell-icon" />
        </ElBadge>
        <span>{{ $t('basicSetting.enhancedMsg.bellNum') }}</span>
      </div>
    </ElRadioButton>
  </ElRadioGroup>
</template>

<style lang="scss" scoped>
.bell-style-radio-group :deep(.el-radio-button) {
  --el-radio-button-checked-bg-color: transparent;
  --el-radio-button-checked-text-color: var(--el-color-primary);
  --el-radio-button-checked-border-color: transparent;

  .el-radio-button__inner {
    padding-right: 2em;
    padding-left: 0;
    background-color: transparent;
    border: 0;
  }
}

.bell-style-radio-content {
  display: flex;
  align-items: center;

  span {
    margin-left: 0.4em;
  }
}

.bell-icon {
  font-size: 1.5em;
}
</style>
