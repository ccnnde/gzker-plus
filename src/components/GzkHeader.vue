<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ElDropdown } from 'element-plus';
import { browser } from 'wxt/browser';

import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { DarkMode, ExtensionMessageType, OptionsKey } from '@/constants';
import { SELECTOR_SHORTCUT_TRIGGER } from '@/constants/selector';

import ElementConfig from './ElementConfig.vue';
import MessageBell from './MessageBell.vue';

import type { ExtensionMessage } from '@/types';

const feedbackDropdown = ref<InstanceType<typeof ElDropdown> | null>(null);
const shortcutTrigger = document.querySelector(SELECTOR_SHORTCUT_TRIGGER);
const shortcutTitle = shortcutTrigger?.getAttribute('title');

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

const modeIconClass = computed(() => {
  if (mode.value === DarkMode.On) {
    return 'i-mdi-weather-night';
  }

  if (mode.value === DarkMode.Off) {
    return 'i-mdi-weather-sunny';
  }

  return 'i-mdi-theme-light-dark';
});

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

onMounted(() => {
  shortcutTrigger?.removeAttribute('title');
});

onUnmounted(() => {
  if (shortcutTrigger && typeof shortcutTitle === 'string' && !shortcutTrigger.hasAttribute('title')) {
    shortcutTrigger.setAttribute('title', shortcutTitle);
  }
});
</script>

<template>
  <ElementConfig>
    <Teleport v-if="shortcutTrigger" :to="shortcutTrigger">
      <ElTooltip
        :content="shortcutTitle?.trim()"
        :enterable="false"
        :hide-after="0"
        :show-arrow="false"
        popper-class="gzkp-tooltip-popper"
      >
        <un-i-mdi-apple-keyboard-command class="gzkp-shortcut-icon" aria-hidden="true" />
      </ElTooltip>
    </Teleport>
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
    <ElTooltip
      :content="modeLabels[mode]"
      :enterable="false"
      :hide-after="0"
      :show-arrow="false"
      popper-class="gzkp-tooltip-popper"
    >
      <div
        :class="['gzkp-header-icon', modeIconClass]"
        @click="cycleMode"
        @keydown.enter.prevent="cycleMode"
        @keydown.space.prevent="cycleMode"
      ></div>
    </ElTooltip>
  </ElementConfig>
</template>

<style lang="scss">
#gzkp-app-header .gzkp-header-icon,
.top-navbar .gzk-nav-shortcuts > .gzk-shortcut-trigger:has(> .gzkp-shortcut-icon) {
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition: color 0.1s ease-in;
}

#gzkp-app-header {
  display: flex;
  gap: var(--gzkp-header-icon-gap);
  align-items: center;
  height: var(--gzkp-top-navbar-height);
  padding: 0 var(--gzkp-header-padding-inline);

  &:not(:has(un-i-mdi-bell-outline)) {
    > div:nth-child(2) {
      display: none;
    }
  }

  .gzkp-header-icon {
    font-size: var(--gzkp-header-icon-size);

    &:is(:hover, :focus-visible) {
      color: var(--gzkp-navbar-text-hover);
    }
  }
}

.top-navbar .gzk-nav-shortcuts {
  &:has(> .gzk-shortcut-trigger > .gzkp-shortcut-icon) {
    padding-block: calc((var(--gzkp-top-navbar-height) - var(--gzkp-header-icon-size)) / 2);
  }

  > .gzk-shortcut-trigger:has(> .gzkp-shortcut-icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--gzkp-header-icon-size);
    height: var(--gzkp-header-icon-size);
    padding: 0;
    margin: 0 calc(var(--gzkp-header-icon-gap) - var(--gzkp-header-padding-inline)) 0 0;
    background-color: transparent;

    &:focus {
      outline: none;
    }

    &:hover {
      color: var(--gzkp-navbar-text-hover);
    }

    > svg {
      display: none;
    }

    > .gzkp-shortcut-icon {
      font-size: 1.3em;
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
