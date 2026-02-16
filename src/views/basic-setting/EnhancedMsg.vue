<script setup lang="ts">
import { BellStyle } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps } from '@/types';

defineProps<SettingProps<OptionsKey.EnhancedMsg>>();
</script>

<template>
  <ElRadioGroup v-model="settings.bellStyle" class="radio-group-transparent">
    <ElRadioButton :label="BellStyle.None">
      <div class="radio-content-with-icon">
        <un-i-mdi-bell-off-outline class="radio-icon" />
        <span>{{ $t('basicSetting.enhancedMsg.bellNone') }}</span>
      </div>
    </ElRadioButton>
    <ElRadioButton :label="BellStyle.Normal">
      <div class="radio-content-with-icon">
        <un-i-mdi-bell-outline class="radio-icon" />
        <span>{{ $t('basicSetting.enhancedMsg.bellNormal') }}</span>
      </div>
    </ElRadioButton>
    <ElRadioButton :label="BellStyle.BadgeDot">
      <div class="radio-content-with-icon">
        <ElBadge is-dot>
          <un-i-mdi-bell-outline class="radio-icon" />
        </ElBadge>
        <span>{{ $t('basicSetting.enhancedMsg.bellDot') }}</span>
      </div>
    </ElRadioButton>
    <ElRadioButton :label="BellStyle.BadgeNum">
      <div class="radio-content-with-icon">
        <ElBadge :value="1">
          <un-i-mdi-bell-outline class="radio-icon" />
        </ElBadge>
        <span>{{ $t('basicSetting.enhancedMsg.bellNum') }}</span>
      </div>
    </ElRadioButton>
  </ElRadioGroup>
</template>
