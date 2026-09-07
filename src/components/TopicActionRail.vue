<script setup lang="ts">
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import QrcodeVue from 'qrcode.vue';

import { useDarkMode } from '@/composables/dark-mode';
import { t } from '@/i18n';
import { getTopicUrl } from '@/utils';

import type { TopicAction } from '@/types';

interface Props {
  actions: readonly TopicAction[];
  topicId?: string;
  topicTitle?: string;
}

const props = defineProps<Props>();

const { isDark } = useDarkMode();

const qrcodeStyle = computed(() => {
  if (isDark.value) {
    return {
      background: '#000',
      foreground: '#fff',
    };
  }

  return {
    background: '#fff',
    foreground: '#000',
  };
});

const topicUrl = computed(() => {
  return getTopicUrl(props.topicId);
});

const copyTopicUrl = async () => {
  await navigator.clipboard.writeText(topicUrl.value);
  ElMessage.success(t('enhancedTopic.copyLinkSuccessfully'));
};

const shareToWeibo = () => {
  window.open(
    `http://service.weibo.com/share/share.php?url=${topicUrl.value}&title=过早客 - ${props.topicTitle}`,
    '_blank',
    'width=550, height=370',
  );
};
</script>

<template>
  <div class="topic-action-rail">
    <div v-if="topicId && topicTitle" class="topic-action-rail-item">
      <ElDropdown placement="left-start" trigger="click">
        <span class="topic-action-rail-dropdown-trigger">
          <ElTooltip
            :content="$t('enhancedTopic.shareTopic')"
            :enterable="false"
            :hide-after="0"
            placement="left"
            popper-class="gzk-tooltip-popper"
          >
            <button class="topic-action-rail-button" type="button" :aria-label="$t('enhancedTopic.shareTopic')">
              <span class="topic-action-rail-button-icon i-mdi-share-variant-outline"></span>
            </button>
          </ElTooltip>
        </span>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem @click="copyTopicUrl">
              <un-i-mdi-link-variant class="topic-action-rail-share-icon topic-action-rail-share-icon-link" />
              {{ $t('enhancedTopic.shareLink') }}
            </ElDropdownItem>
            <ElDropdownItem @click="shareToWeibo">
              <un-i-mdi-sina-weibo class="topic-action-rail-share-icon topic-action-rail-share-icon-weibo" />
              {{ $t('enhancedTopic.shareWeibo') }}
            </ElDropdownItem>
            <ElDropdownItem class="topic-action-rail-share-dropdown-wechat">
              <div>
                <un-i-mdi-wechat class="topic-action-rail-share-icon topic-action-rail-share-icon-wechat" />
                {{ $t('enhancedTopic.shareWeChat') }}
              </div>
              <QrcodeVue
                :value="topicUrl"
                :size="65"
                :background="qrcodeStyle.background"
                :foreground="qrcodeStyle.foreground"
              />
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
    </div>
    <div
      v-for="action in actions"
      :key="action.label"
      :class="['topic-action-rail-item', { 'topic-action-rail-item-divided': action.showDivider }]"
    >
      <ElTooltip
        :content="action.label"
        :enterable="false"
        :hide-after="0"
        placement="left"
        popper-class="gzk-tooltip-popper"
      >
        <button
          class="topic-action-rail-button"
          type="button"
          :aria-label="action.label"
          :aria-busy="action.loading ? 'true' : undefined"
          :disabled="action.loading"
          @click="action.handler()"
        >
          <span
            :class="['topic-action-rail-button-icon', action.loading ? 'i-mdi-loading animate-spin' : action.iconClass]"
          ></span>
        </button>
      </ElTooltip>
    </div>
  </div>
</template>

<style lang="scss">
.topic-action-rail-share-dropdown-wechat {
  flex-direction: column;

  & > div {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
  }
}

.topic-action-rail-share-icon {
  margin-right: 5px;
  font-size: 16px;
}

.topic-action-rail-share-icon-link {
  color: #9fadc7;
}

.topic-action-rail-share-icon-weibo {
  color: #f46623;
}

.topic-action-rail-share-icon-wechat {
  color: #3fc15f;
}
</style>

<style lang="scss" scoped>
.topic-action-rail {
  position: absolute;
  right: -52px;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.topic-action-rail-dropdown-trigger {
  display: block;
  width: 36px;
  height: 36px;
}

.topic-action-rail-item {
  position: relative;
  width: 36px;
  height: 36px;
}

.topic-action-rail-item-divided {
  margin-top: 12px;

  &::before {
    position: absolute;
    top: -11px;
    left: 50%;
    width: 24px;
    height: 2px;
    pointer-events: none;
    content: '';
    background-color: var(--el-border-color-darker);
    border-radius: 1px;
    transform: translateX(-50%);
  }
}

.topic-action-rail-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background-color: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-light);
  transition: color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover,
  &:focus-visible {
    color: var(--el-color-primary);
    border-color: var(--el-color-primary);
    outline: none;
    box-shadow: 0 4px 12px rgb(var(--el-color-primary-rgb) 0.18);
  }

  &:active {
    transform: scale(0.94);
  }

  &:disabled {
    cursor: default;
  }
}

.topic-action-rail-button-icon {
  font-size: 16px;
}
</style>
