<script setup lang="ts">
import { inject } from 'vue';

import { vImgLoad } from '@/directives';
import { convertEmojiToNative } from '@/utils/emoji';
import { linkifyContent } from '@/utils/reply-content';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';
import { SELECTOR_USER_LINK } from '@/constants/selector';

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

const updateUserInfoTrigger = (el: HTMLElement, uid: string | undefined) => {
  const authorAnchor = el.querySelector<HTMLAnchorElement>(SELECTOR_USER_LINK);

  if (!authorAnchor) {
    return;
  }

  if (!uid) {
    delete authorAnchor.dataset.gzkUserInfoTrigger;
    delete authorAnchor.dataset.userUid;
    return;
  }

  authorAnchor.dataset.gzkUserInfoTrigger = '';
  authorAnchor.dataset.userUid = uid;
};

const vUserInfoTrigger: ObjectDirective<HTMLElement, string | undefined> = {
  mounted: (el, binding) => {
    updateUserInfoTrigger(el, binding.value);
  },
  updated: (el, binding) => {
    updateUserInfoTrigger(el, binding.value);
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
          <span
            v-blank-anchor
            v-user-info-trigger="authorId"
            class="user-id detail-author"
            v-html="meta.authorInfo"
          ></span>
          <div class="user-meta detail-meta">
            <span v-blank-anchor v-html="meta.nodeInfo"></span>
            <span v-html="meta.createdTime"></span>
            <span v-if="meta.lastReplyUser" v-blank-anchor v-html="meta.lastReplyUser"></span>
            <span v-if="meta.lastReplyTime" v-html="meta.lastReplyTime"></span>
          </div>
        </div>
      </div>
    </header>
    <section
      v-img-load="updateScrollbar"
      class="main-content markdown-body"
      v-html="linkifyContent(convertEmojiToNative(content) || '')"
    ></section>
    <div v-if="editInfo || tags?.length" class="topic-detail-extra">
      <div v-if="editInfo" class="topic-detail-edit-info">{{ editInfo }}</div>
      <div v-if="tags?.length" class="topic-detail-tags">
        <a
          v-for="tag in tags"
          :key="tag.href"
          class="topic-detail-tag"
          :href="tag.href"
          target="_blank"
          rel="noopener noreferrer"
        >
          <un-i-mdi-tag-outline aria-hidden="true" />
          <span>{{ tag.name }}</span>
        </a>
      </div>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.topic-detail-extra {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 15px;
  font-size: 12px;
  line-height: 1.6;
}

.topic-detail-edit-info {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.topic-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
  min-width: 0;
}

.topic-detail-tag {
  box-sizing: border-box;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  max-width: 100%;
  padding: 2px 12px;
  line-height: 20px;
  color: var(--gzk-topic-tag-text-color);
  text-decoration: none;
  overflow-wrap: anywhere;
  user-select: none;
  background-color: var(--gzk-topic-tag-bg-color);
  border-radius: 12px;
}

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
