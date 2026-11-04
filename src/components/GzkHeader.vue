<script setup lang="ts">
import { ref } from 'vue';
import { ElDropdown } from 'element-plus';
import { browser } from 'wxt/browser';

import { ExtensionMessageType } from '@/constants';

import ElementConfig from './ElementConfig.vue';
import MessageBell from './MessageBell.vue';

import type { ExtensionMessage } from '@/types';

const feedbackDropdown = ref<InstanceType<typeof ElDropdown> | null>(null);

const openExtOptions = () => {
  const msg: ExtensionMessage = {
    msgType: ExtensionMessageType.OpenOptionsPage,
  };

  browser.runtime.sendMessage(msg);
};
</script>

<template>
  <ElementConfig>
    <ElDropdown ref="feedbackDropdown" trigger="click" popper-class="gzkp-feedback-popper">
      <div>
        <ElTooltip
          :content="$t('gzkHeader.feedback')"
          :enterable="false"
          :hide-after="0"
          :show-arrow="false"
          popper-class="gzkp-tooltip-popper"
        >
          <un-i-mdi-account-question-outline class="gzkp-header-icon" />
        </ElTooltip>
      </div>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem>
            <a
              class="gzkp-feedback-link"
              href="/t/108340"
              target="_blank"
              @click="feedbackDropdown?.popperRef?.onClose"
            >
              {{ $t('gzkHeader.gzkTopic') }}
            </a>
          </ElDropdownItem>
          <ElDropdownItem>
            <a class="gzkp-feedback-link" href="https://github.com/ccnnde/gzker-plus/issues" target="_blank">
              {{ $t('gzkHeader.gzkIssue') }}
            </a>
          </ElDropdownItem>
          <ElDropdownItem>
            <div class="gzkp-qq-group-qrcode"></div>
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
    <MessageBell />
    <ElTooltip
      :content="$t('gzkHeader.gzkSettings')"
      :enterable="false"
      :hide-after="0"
      :show-arrow="false"
      popper-class="gzkp-tooltip-popper"
    >
      <un-i-mdi-cog-outline class="gzkp-header-icon" @click="openExtOptions" />
    </ElTooltip>
  </ElementConfig>
</template>

<style lang="scss">
#gzkp-app-header {
  --gzkp-header-width: 9em;

  position: absolute;
  left: calc(-1 * var(--gzkp-header-width));
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: var(--gzkp-header-width);
  height: 100%;

  &:not(:has(un-i-mdi-bell-outline)) {
    --gzkp-header-width: 6.5em;

    div:nth-child(2) {
      display: none;
    }
  }

  .gzkp-header-icon {
    font-size: 1.4em;
    color: var(--el-text-color-primary);
    cursor: pointer;
    transition: color 0.1s ease-in;

    &:hover {
      color: var(--gzkp-navbar-text-hover);
    }
  }
}

.gzkp-feedback-popper {
  .el-dropdown-menu__item {
    &:has(.gzkp-feedback-link) {
      padding: 0;
    }

    .gzkp-feedback-link {
      box-sizing: border-box;
      display: block;
      width: 100%;
      padding: 5px 16px;
      color: var(--el-text-color-regular);

      &:hover {
        text-decoration: none;
      }
    }

    &:not(.is-disabled):focus a {
      color: var(--el-color-primary);
    }

    &:has(.gzkp-qq-group-qrcode) {
      padding: 0;

      &:not(.is-disabled):focus {
        background-color: transparent;
      }
    }
  }
}

.gzkp-qq-group-qrcode {
  width: 150px;
  height: 200px;
  background-image: var(--gzkp-qq-group-qrcode);
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.navbar-right {
  position: relative;
}
</style>
