<script setup lang="ts">
import { computed, inject } from 'vue';
import { ElMessage } from 'element-plus';
import QrcodeVue from 'qrcode.vue';

import { t } from '@/i18n';
import { API_TOPIC } from '@/api';
import { GZK_URL } from '@/constants';
import { WRITE_REPLY_INJECTION_KEY } from '@/constants/inject-key';

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
}

const props = defineProps<Props>();

defineEmits<{
  favoriteTopic: [];
  likeTopic: [];
}>();

const topicUrl = computed(() => {
  return `${GZK_URL}${API_TOPIC}${props.topicId}`;
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

const writeReply = inject(WRITE_REPLY_INJECTION_KEY);
</script>

<template>
  <div class="footer-container">
    <OperateButton :tip-content="$t('common.reply')" icon-class="i-mdi-chat-outline" :operate-text="replyTotal" />
    <OperateButton
      :tip-content="$t('common.favorite')"
      :icon-class="favoriteIconClass"
      :operate-text="favoriteNumber"
      :custom-style="favoriteButtonStyle"
      @click="$emit('favoriteTopic')"
    />
    <LikeButton :liked="liked" :like-number="likeNumber" @handle-like="$emit('likeTopic')" />
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
            <QrcodeVue :value="topicUrl" :size="65" />
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
    <ElButton class="reply-button" type="primary" size="small" @click="writeReply?.()">
      {{ $t('enhancedTopic.writeReply') }}
    </ElButton>
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
  height: 50px;
  padding: 0 var(--gzk-topic-padding);
  border-bottom-right-radius: var(--el-border-radius-base);
  border-bottom-left-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-lighter);
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

.reply-button {
  position: absolute;
  right: var(--gzk-topic-padding);
}
</style>
