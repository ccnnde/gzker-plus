<script setup lang="ts">
import { runtime } from 'webextension-polyfill';

import { ExtensionMessageType } from '@/constants';

import ElementConfig from './ElementConfig.vue';
import MessageBell from './MessageBell.vue';

import type { ExtensionMessage } from '@/types';

const openExtOptions = () => {
  const msg: ExtensionMessage = {
    msgType: ExtensionMessageType.OpenOptionsPage,
  };

  runtime.sendMessage(msg);
};
</script>

<template>
  <ElementConfig>
    <MessageBell />
    <ElTooltip :content="$t('gzkHeader.gzkSettings')" :show-arrow="false">
      <un-i-mdi-cog-outline class="header-icon" @click="openExtOptions" />
    </ElTooltip>
  </ElementConfig>
</template>

<style lang="scss">
$gzker-header-width: 7em;

#gzk-app-header {
  position: absolute;
  left: -$gzker-header-width;
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: $gzker-header-width;
  height: 100%;

  .header-icon {
    font-size: 1.4em;
    color: #333;
    cursor: pointer;
    transition: color 0.1s ease-in;

    &:hover {
      color: #db4937;
    }
  }
}

.navbar-right {
  position: relative;
}
</style>
