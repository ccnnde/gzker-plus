<script setup lang="ts">
import { computed, inject } from 'vue';

import { vImgLoad } from '@/directives';
import { convertEmojiToNative } from '@/utils/emoji';
import { linkifyContent } from '@/utils/reply-content';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

import UserAvatar from './UserAvatar.vue';

import type { UserTopicDetail } from '@/types';

const props = defineProps<UserTopicDetail>();

const postedAtTitle = computed(() => {
  const parts = props.meta?.postedAt?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);

  if (!parts) {
    return undefined;
  }

  return `${parts[1]} ${parts[2]}`;
});

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
        <div v-if="meta" class="topic-detail-info">
          <div class="user-id topic-detail-author">
            <a
              v-if="meta.authorName"
              class="topic-detail-author-link"
              :data-gzk-user-info-trigger="authorId ? '' : undefined"
              :data-user-uid="authorId"
              :href="authorLink"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ meta.authorName }}
            </a>
          </div>
          <div class="user-meta topic-detail-meta">
            <span v-if="meta.node" class="topic-detail-meta-item">
              <a :href="meta.node.href" :title="meta.node.title" target="_blank" rel="noopener noreferrer">
                {{ meta.node.text }}
              </a>
            </span>
            <span v-if="meta.createdTime" class="topic-detail-meta-item" :title="postedAtTitle">
              {{ meta.createdTime }}
            </span>
            <span v-if="meta.lastReplyUser || meta.lastReplyPrefix" class="topic-detail-meta-item">
              {{ meta.lastReplyPrefix }}
              <a
                v-if="meta.lastReplyUser"
                :href="meta.lastReplyUser.href"
                :title="meta.lastReplyUser.title"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>{{ meta.lastReplyUser.text }}</strong>
              </a>
              {{ meta.lastReplySuffix }}
            </span>
            <span v-if="meta.lastReplyTime" class="topic-detail-meta-item">{{ meta.lastReplyTime }}</span>
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
  align-items: center;
}

.topic-detail-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
  min-width: 0;
  margin-left: 10px;
  font-family: var(--el-font-family);
}

.topic-detail-author {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 18px;
  line-height: 24px;
}

.topic-detail-author-link {
  font-weight: var(--el-font-weight-primary);
  color: var(--el-text-color-regular);
  overflow-wrap: anywhere;
}

.topic-detail-meta {
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: var(--el-text-color-regular);
  overflow-wrap: anywhere;

  a {
    color: var(--el-text-color-secondary);
  }
}
</style>
