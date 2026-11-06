<script setup lang="ts">
import { SearchResultType } from '@/constants';

import type { SearchTopicItem } from '@/types';

interface Props {
  item: SearchTopicItem;
}

const props = defineProps<Props>();

const getResultLink = (): string => {
  return props.item.replyId ? `${props.item.link}#r${props.item.replyId}` : props.item.link || '';
};
</script>

<template>
  <div class="gzkp-search-result">
    <span class="gzkp-search-result__topline">
      <a
        class="gzkp-search-result__title"
        :href="getResultLink()"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
        v-html="item.title"
      ></a>
    </span>
    <span class="gzkp-search-result__meta">
      <a
        v-if="item.nodeName && item.nodeLink"
        :href="item.nodeLink"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >
        {{ item.nodeName }}
      </a>
      <a
        v-if="item.authorId && item.authorLink"
        :href="item.authorLink"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >
        {{ item.authorId }}
      </a>
      <span v-if="item.createdTime">{{ item.createdTime }}</span>
      <span>
        {{ item.matchType === SearchResultType.Reply ? $t('search.reply') : $t('search.topic') }}
      </span>
    </span>
    <span v-if="item.excerpt" class="gzkp-search-result__excerpt" v-html="item.excerpt"></span>
  </div>
</template>

<style lang="scss" scoped>
.gzkp-search-result {
  display: block;
  min-width: 0;
  padding: 12px 14px;
  color: inherit;
  text-decoration: none;
  border: 0;
  border-radius: 9px;
}

.gzkp-search-result__topline {
  display: flex;
  align-items: flex-start;
}

.gzkp-search-result__title,
.gzkp-search-result__excerpt {
  :deep(mark) {
    padding: 0;
    color: var(--gzkp-search-highlight-color);
    background: transparent;
  }
}

.gzkp-search-result__title {
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--el-text-color-primary);
  text-decoration: none;
  overflow-wrap: anywhere;

  &:hover {
    color: var(--el-text-color-primary);
    text-decoration: underline;
    text-decoration-thickness: 1.5px;
    text-underline-offset: 3px;
  }
}

.gzkp-search-result__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-width: 0;
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;

  > * {
    color: inherit;
  }

  > a {
    text-decoration: none;

    &:hover {
      color: inherit;
      text-decoration: underline;
      text-decoration-thickness: 1.5px;
      text-underline-offset: 3px;
    }
  }

  > * + *::before {
    display: inline-block;
    margin-right: 5px;
    font-size: 16px;
    line-height: 1;
    color: var(--el-text-color-placeholder);
    text-decoration: none;
    vertical-align: middle;
    content: '·';
  }
}

.gzkp-search-result__excerpt {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  font-size: 14px;
  line-height: 1.55;
  color: var(--el-text-color-regular);
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
