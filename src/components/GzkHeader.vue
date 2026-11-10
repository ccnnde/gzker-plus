<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElDropdown } from 'element-plus';
import { browser } from 'wxt/browser';

import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { DarkMode, ExtensionMessageType, OptionsKey } from '@/constants';
import { SELECTOR_SHORTCUT_TRIGGER } from '@/constants/selector';

import themeMoonIcon from '@/assets/icons/theme-moon.svg?raw';
import themeSunIcon from '@/assets/icons/theme-sun.svg?raw';
import themeSystemIcon from '@/assets/icons/theme-system.svg?raw';

import ElementConfig from './ElementConfig.vue';
import MessageBell from './MessageBell.vue';

import type { ExtensionMessage } from '@/types';

const feedbackDropdown = ref<InstanceType<typeof ElDropdown> | null>(null);
const shortcutTrigger = document.querySelector<HTMLElement>(SELECTOR_SHORTCUT_TRIGGER);

const storage = useStorageStore();

const settings = computed(() => {
  return storage.options?.[OptionsKey.DarkMode];
});

const mode = computed(() => {
  return settings.value?.mode ?? DarkMode.System;
});

const modeLabels = computed(() => {
  return {
    [DarkMode.Off]: t('gzkHeader.lightMode'),
    [DarkMode.On]: t('basicSetting.darkMode.title'),
    [DarkMode.System]: t('basicSetting.darkMode.system'),
  };
});

const modeIcons = {
  [DarkMode.On]: themeMoonIcon,
  [DarkMode.Off]: themeSunIcon,
  [DarkMode.System]: themeSystemIcon,
};

const cycleMode = () => {
  if (!settings.value) {
    return;
  }

  if (mode.value === DarkMode.On) {
    settings.value.mode = DarkMode.Off;
  } else if (mode.value === DarkMode.Off) {
    settings.value.mode = DarkMode.System;
  } else {
    settings.value.mode = DarkMode.On;
  }
};

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
    <ElTooltip
      :content="modeLabels[mode]"
      :enterable="false"
      :hide-after="0"
      :show-arrow="false"
      popper-class="gzkp-tooltip-popper"
    >
      <div
        class="gzkp-header-icon gzkp-header-theme-icon"
        @click="cycleMode"
        @keydown.enter.prevent="cycleMode"
        @keydown.space.prevent="cycleMode"
        v-html="modeIcons[mode]"
      ></div>
    </ElTooltip>
  </ElementConfig>
</template>

<style lang="scss">
#gzkp-app-header {
  display: flex;
  gap: var(--gzkp-header-icon-gap);
  align-items: center;
  height: var(--gzkp-top-navbar-height);
  padding: 0 var(--gzkp-header-padding-inline);

  .gzkp-header-icon {
    font-size: var(--gzkp-header-icon-size);
    color: var(--el-text-color-primary);
    cursor: pointer;
    transition: color 0.1s ease-in;

    &:is(:hover, :focus-visible) {
      color: var(--gzkp-navbar-text-hover);
    }
  }

  .gzkp-header-theme-icon > svg {
    display: block;
    width: 1em;
    height: 1em;
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
  --gzkp-header-icon-gap: 20px;
  --gzkp-header-icon-size: 1.4em;
  --gzkp-header-padding-inline: 12px;

  position: relative;
}

.gzkp-theme-controlled {
  .gzk-nav-theme > [data-gzk-theme-toggle],
  .gzk-night-notice {
    display: none !important;
  }
}
</style>
