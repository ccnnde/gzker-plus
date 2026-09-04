<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import QrcodeVue from 'qrcode.vue';

import { useDarkMode } from '@/composables/dark-mode';
import { t } from '@/i18n';
import { addUnit, getTopicUrl } from '@/utils';
import { ADD_REPLY_INJECTION_KEY } from '@/constants/inject-key';

import LikeButton from './LikeButton.vue';
import OperateButton from './OperateButton.vue';

import type { CSSProperties } from 'vue';

interface Props {
  topicId?: string;
  topicTitle?: string;
  replyTotal?: string;
  favorited?: boolean;
  favoriteNumber?: string;
  liked?: boolean;
  likeNumber?: string;
  editable?: boolean;
  height: number;
  reverseReply?: boolean;
  onlyOriginalPoster?: boolean;
  loading?: boolean;
}

const props = defineProps<Props>();

defineEmits<{
  favoriteTopic: [];
  likeTopic: [];
  editTopic: [];
  blockTopic: [];
  toggleReplyOrder: [];
  toggleOriginalPoster: [];
}>();

const TOOLTIP_ENABLE_DELAY = 500;

const actionTooltipDisabled = ref(false);

let enableTooltipTimer: number | undefined;

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

const favoriteIconClass = computed(() => {
  return props.favorited ? 'i-mdi-bookmark' : 'i-mdi-bookmark-outline';
});

const favoriteButtonStyle = computed<CSSProperties | undefined>(() => {
  if (props.favorited) {
    return {
      color: '#F9CB0E',
    };
  }

  return undefined;
});

const footerStyle = computed<CSSProperties>(() => {
  return {
    height: addUnit(props.height),
  };
});

const showReplyOrderButton = computed<boolean>(() => {
  return props.replyTotal !== '0';
});

const onlyOriginalPosterIconClass = computed<string>(() => {
  return props.onlyOriginalPoster ? 'i-mdi-account-star' : 'i-mdi-account-star-outline';
});

const onlyOriginalPosterIconStyle = computed<CSSProperties | undefined>(() => {
  const fontSize = '18px';

  if (!props.onlyOriginalPoster) {
    return {
      fontSize,
    };
  }

  return {
    color: 'var(--el-color-primary)',
    fontSize,
  };
});

const replyOrderIconStyle = computed<CSSProperties>(() => {
  const fontSize = '18px';

  if (!props.reverseReply) {
    return {
      fontSize,
    };
  }

  return {
    color: 'var(--el-color-success)',
    fontSize,
  };
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

watch(
  () => props.loading,
  (loading) => {
    window.clearTimeout(enableTooltipTimer);
    enableTooltipTimer = undefined;

    if (loading) {
      actionTooltipDisabled.value = true;
      return;
    }

    if (!actionTooltipDisabled.value) {
      return;
    }

    enableTooltipTimer = window.setTimeout(() => {
      actionTooltipDisabled.value = false;
      enableTooltipTimer = undefined;
    }, TOOLTIP_ENABLE_DELAY);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  window.clearTimeout(enableTooltipTimer);
});

const addReply = inject(ADD_REPLY_INJECTION_KEY);
</script>

<template>
  <div class="footer-container" :style="footerStyle">
    <OperateButton :tip-content="$t('common.reply')" icon-class="i-mdi-chat-outline" :operate-text="replyTotal" />
    <OperateButton
      :tip-content="$t('common.favorite')"
      :icon-class="favoriteIconClass"
      :operate-text="favoriteNumber"
      :custom-style="favoriteButtonStyle"
      :tip-disabled="actionTooltipDisabled"
      @click="$emit('favoriteTopic')"
    />
    <LikeButton
      :liked="liked"
      :like-number="likeNumber"
      :tip-disabled="actionTooltipDisabled"
      @handle-like="$emit('likeTopic')"
    />
    <OperateButton
      v-if="showReplyOrderButton"
      :tip-content="$t('enhancedTopic.onlyOriginalPoster')"
      :icon-class="onlyOriginalPosterIconClass"
      :custom-style="onlyOriginalPosterIconStyle"
      :tip-disabled="actionTooltipDisabled"
      @click="$emit('toggleOriginalPoster')"
    />
    <OperateButton
      v-if="showReplyOrderButton"
      :tip-content="$t('enhancedTopic.reverseReplyOrder')"
      icon-class="i-mdi-filter-variant"
      :custom-style="replyOrderIconStyle"
      :tip-disabled="actionTooltipDisabled"
      @click="$emit('toggleReplyOrder')"
    />
    <ElDropdown trigger="click">
      <span>
        <OperateButton :tip-content="$t('enhancedTopic.share')" icon-class="i-mdi-share-variant-outline" />
      </span>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem @click="copyTopicUrl">
            <un-i-mdi-link-variant class="share-icon share-icon-link" />
            {{ $t('enhancedTopic.shareLink') }}
          </ElDropdownItem>
          <ElDropdownItem @click="shareToWeibo">
            <un-i-mdi-sina-weibo class="share-icon share-icon-weibo" />
            {{ $t('enhancedTopic.shareWeibo') }}
          </ElDropdownItem>
          <ElDropdownItem class="share-dropdown-wechat">
            <div>
              <un-i-mdi-wechat class="share-icon share-icon-wechat" />
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
    <OperateButton v-if="editable" :operate-text="$t('enhancedTopic.editTopic')" @click="$emit('editTopic')" />
    <OperateButton v-else :operate-text="$t('enhancedTopic.blockTopic')" @click="$emit('blockTopic')" />
    <ElInput class="reply-input" :placeholder="$t('enhancedTopic.writeReply')" @focus="addReply?.()" />
  </div>
</template>

<style lang="scss">
.share-dropdown-wechat {
  flex-direction: column;

  & > div {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
  }
}
</style>

<style lang="scss" scoped>
.footer-container {
  display: flex;
  align-items: center;
  padding: 0 var(--gzk-topic-padding);
  border-top: 1px solid var(--el-border-color-lighter);
  border-bottom-right-radius: var(--el-border-radius-base);
  border-bottom-left-radius: var(--el-border-radius-base);
}

.share-icon {
  margin-right: 5px;
  font-size: 16px;
}

.share-icon-link {
  color: #9fadc7;
}

.share-icon-weibo {
  color: #f46623;
}

.share-icon-wechat {
  color: #3fc15f;
}

.reply-input {
  flex: 1;
}
</style>
