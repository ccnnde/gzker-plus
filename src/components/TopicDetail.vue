<script setup lang="ts">
import { inject } from 'vue';

import { vImgLoad } from '@/directives';
import { convertEmojiToNative } from '@/utils/emoji';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import UserAvatar from './UserAvatar.vue';

import type { ObjectDirective } from 'vue';
import type { UserTopicDetail } from '@/types';

defineProps<UserTopicDetail>();

/**
 * 将 html 内容中的链接设置为新标签页打开
 */
const vBlankAnchor: ObjectDirective<HTMLElement> = {
  mounted: (el) => {
    const anchorElements = el.querySelectorAll('a');

    anchorElements.forEach((element) => {
      element.target = '_blank';
    });
  },
};

const updateScrollbar = inject(UPDATE_SCROLLBAR_INJECTION_KEY);
</script>

<template>
  <article>
    <header>
      <div class="detail-header-top">
        <div class="detail-title" v-html="title"></div>
        <div class="detail-reading">
          <span class="number-info">{{ $t('enhancedTopic.clickNumber') }}</span>
          <span class="number-info">{{ clickNumber }}</span>
        </div>
      </div>
      <div class="detail-header-bottom">
        <UserAvatar :uid="authorId" :user-link="authorLink" :avatar-url="avatarUrl" :avatar-size="50" />
        <div v-if="meta" class="detail-info">
          <span v-blank-anchor class="user-id detail-author" v-html="meta.authorInfo"></span>
          <div class="user-meta detail-meta">
            <span v-blank-anchor v-html="meta.nodeInfo"></span>
            <span v-html="meta.createdTime"></span>
            <span v-if="meta.lastReplyUser" v-blank-anchor v-html="meta.lastReplyUser"></span>
            <span v-if="meta.lastReplyTime" v-html="meta.lastReplyTime"></span>
          </div>
        </div>
      </div>
    </header>
    <section v-img-load="updateScrollbar" class="main-content" v-html="convertEmojiToNative(content)"></section>
  </article>
</template>

<style lang="scss" scoped>
.detail-header-top {
  position: relative;
  margin-bottom: 10px;
}

.detail-title {
  width: 85%;
  font-size: 20px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.detail-reading {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 5px 15px;
  font-size: 12px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
}

.detail-header-bottom {
  display: flex;
}

.detail-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-left: 10px;

  :deep(a) {
    color: var(--el-text-color-secondary);
  }
}

.detail-author {
  font-size: 18px;
}

.detail-meta {
  font-size: 14px;
}
</style>
