<script setup lang="ts">
import { ref } from 'vue';
import { ElDropdown } from 'element-plus';
import { runtime } from 'webextension-polyfill';

import { ExtensionMessageType } from '@/constants';

import ElementConfig from './ElementConfig.vue';
import MessageBell from './MessageBell.vue';

import type { ExtensionMessage } from '@/types';

const feedbackDropdown = ref<InstanceType<typeof ElDropdown> | null>(null);

const openExtOptions = () => {
  const msg: ExtensionMessage = {
    msgType: ExtensionMessageType.OpenOptionsPage,
  };

  runtime.sendMessage(msg);
};
</script>

<template>
  <ElementConfig>
    <ElDropdown ref="feedbackDropdown" trigger="click" popper-class="feedback-popper">
      <div>
        <ElTooltip :content="$t('gzkHeader.feedback')" :show-arrow="false">
          <un-i-mdi-account-question-outline class="header-icon" />
        </ElTooltip>
      </div>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem>
            <a href="/t/108340" target="_blank" @click="feedbackDropdown?.popperRef?.onClose">
              {{ $t('gzkHeader.gzkTopic') }}
            </a>
          </ElDropdownItem>
          <ElDropdownItem>
            <a href="https://github.com/ccnnde/gzker-plus/issues" target="_blank">
              {{ $t('gzkHeader.gzkIssue') }}
            </a>
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
    <MessageBell />
    <ElTooltip :content="$t('gzkHeader.gzkSettings')" :show-arrow="false">
      <un-i-mdi-cog-outline class="header-icon" @click="openExtOptions" />
    </ElTooltip>
  </ElementConfig>
</template>

<style lang="scss">
$gzker-header-width: 9em;

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

.feedback-popper {
  .el-dropdown-menu__item {
    a {
      color: var(--el-text-color-regular);

      &:hover {
        text-decoration: none;
      }
    }

    &:not(.is-disabled):focus a {
      color: var(--el-color-primary);
    }
  }
}

.navbar-right {
  position: relative;
}
</style>
