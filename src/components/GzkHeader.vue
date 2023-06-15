<script setup lang="ts">
import { runtime } from 'webextension-polyfill';

import { ExtensionMessageType } from '@/constants';
import { ExtensionMessage } from '@/types';

import ElementConfig from './ElementConfig.vue';

const openExtOptions = () => {
  const msg: ExtensionMessage = {
    msgType: ExtensionMessageType.OpenOptionsPage,
  };

  runtime.sendMessage(msg);
};
</script>

<template>
  <ElementConfig>
    <ElTooltip :content="$t('gzkHeader.gzkSettings')">
      <un-i-mdi-cog-outline class="header-icon" @click="openExtOptions" />
    </ElTooltip>
  </ElementConfig>
</template>

<style lang="scss">
$gzker-header-width: 5em;

#gzk-app-header {
  position: absolute;
  left: -$gzker-header-width;
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: $gzker-header-width;
  height: 100%;
}

.navbar-right {
  position: relative;
}
</style>

<style lang="scss" scoped>
.header-icon {
  font-size: 1.4em;
  color: #333;
  cursor: pointer;
  transition: all 0.1s ease-in;

  &:hover {
    color: #db4937;
  }
}
</style>
