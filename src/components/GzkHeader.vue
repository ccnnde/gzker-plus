<script setup lang="ts">
import { ref } from 'vue';
import { ElDropdown } from 'element-plus';
import { browser } from 'wxt/browser';

import { ExtensionMessageType } from '@/constants';
import { SELECTOR_SHORTCUT_TRIGGER } from '@/constants/selector';

import DarkModeToggle from './DarkModeToggle.vue';
import ElementConfig from './ElementConfig.vue';
import MessageBell from './MessageBell.vue';

import type { ExtensionMessage } from '@/types';

const feedbackDropdown = ref<InstanceType<typeof ElDropdown> | null>(null);
const shortcutTrigger = document.querySelector<HTMLElement>(SELECTOR_SHORTCUT_TRIGGER);

const openExtOptions = () => {
  const msg: ExtensionMessage = {
    msgType: ExtensionMessageType.OpenOptionsPage,
  };

  browser.runtime.sendMessage(msg);
};

const openShortcuts = () => {
  shortcutTrigger?.click();
};
</script>

<template>
  <ElementConfig>
    <ElTooltip
      v-if="shortcutTrigger"
      :content="$t('gzkHeader.keyboardShortcuts')"
      :enterable="false"
      :hide-after="0"
      :show-arrow="false"
      popper-class="gzkp-tooltip-popper"
    >
      <div
        class="gzkp-header-icon i-gzkp-shortcut-command"
        @click="openShortcuts"
        @keydown.enter.prevent="openShortcuts"
        @keydown.space.prevent="openShortcuts"
      ></div>
    </ElTooltip>
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
      <div class="gzkp-header-icon i-gzkp-settings" @click="openExtOptions"></div>
    </ElTooltip>
    <DarkModeToggle class="gzkp-header-icon gzkp-header-theme-icon" />
  </ElementConfig>
</template>

<style lang="scss">
.gzkp-feedback-popper {
  .el-scrollbar__wrap {
    max-height: calc(100dvh - 72px);
  }

  .el-dropdown-menu__item {
    &:has(.gzkp-feedback-link, .gzkp-qq-group-qrcode) {
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

    &:has(.gzkp-qq-group-qrcode):not(.is-disabled):focus {
      background-color: transparent;
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
</style>
