<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { ElInput } from 'element-plus';

import { blurActiveElement } from '@/utils';
import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getAllSearchHistory,
} from '@/utils/search-history-store';
import { BING_SITE_SEARCH_PREFIX, IframeMessageType } from '@/constants';

import type { FetchNextPageMessage, SearchHistoryItem, SearchResultItem, SearchResultMessage } from '@/types';

const inputValue = ref('');
const isFocused = ref(false);
const isFirstPageLoading = ref(false);
const isNextPageLoading = ref(false);
const isFirstPageEmpty = ref(false);
const errorOccurred = ref(false);
const results = ref<SearchResultItem[]>([]);
const nextPageUrl = ref<string | null>(null);
const highLightIndex = ref(-1);
const historyList = ref<SearchHistoryItem[]>([]);
const showHistory = ref(true);

let panelMousedown = false;

let iframeEl: HTMLIFrameElement | null = null;
let currentPageUrl: string | null = null;

const showPanel = computed(() => {
  return isFocused.value && (inputValue.value.trim() !== '' || historyList.value.length > 0);
});

const disableNextPage = computed(() => {
  return isNextPageLoading.value || !nextPageUrl.value || isFirstPageEmpty.value;
});

onMounted(() => {
  window.addEventListener('message', handleSearchMessage);
  document.addEventListener('mousedown', handlePanelMousedown, true);
});

onUnmounted(() => {
  window.removeEventListener('message', handleSearchMessage);
  document.removeEventListener('mousedown', handlePanelMousedown, true);
});

const stepDirection = (direction: 'up' | 'down') => {
  const maxIndex = results.value.length - 1;

  if (maxIndex < 0) {
    highLightIndex.value = -1;
    return;
  }

  if (direction === 'down') {
    highLightIndex.value = highLightIndex.value >= maxIndex ? 0 : highLightIndex.value + 1;
  } else {
    highLightIndex.value = highLightIndex.value <= 0 ? maxIndex : highLightIndex.value - 1;
  }
};

const openResult = (url?: string) => {
  const targetUrl = url || results.value[highLightIndex.value]?.url;

  if (targetUrl) {
    window.open(targetUrl, '_blank');
  }
};

const handleInputKeydown = (e: Event) => {
  const ke = e as KeyboardEvent;

  if (!showPanel.value || results.value.length === 0) {
    return;
  }

  switch (ke.key) {
    case 'ArrowDown':
      e.preventDefault();
      stepDirection('down');
      break;
    case 'ArrowUp':
      e.preventDefault();
      stepDirection('up');
      break;
    case 'Escape':
      e.preventDefault();
      closePanel();
      break;
  }
};

const handleResultKeydown = (e: Event, url: string) => {
  const ke = e as KeyboardEvent;

  if (ke.key === 'Enter') {
    e.preventDefault();
    window.open(url, '_blank');
  }
};

const closePanel = () => {
  isFocused.value = false;
  highLightIndex.value = -1;
  blurActiveElement();
};

const resetSearchState = () => {
  results.value = [];
  nextPageUrl.value = null;
  currentPageUrl = null;
  highLightIndex.value = -1;
  isFirstPageEmpty.value = false;
  errorOccurred.value = false;
};

const createIframe = () => {
  if (iframeEl) {
    return;
  }

  iframeEl = document.createElement('iframe');
  iframeEl.style.cssText = 'display:none;width:0;height:0;border:none;';
  document.body.appendChild(iframeEl);
};

const loadIframe = (url: string) => {
  createIframe();

  if (iframeEl) {
    iframeEl.src = url;
  }
};

const handleSearchMessage = (event: MessageEvent<SearchResultMessage>) => {
  if (event.data?.type !== IframeMessageType.GzkSearchResult) {
    return;
  }

  const { results: newResults, nextPageUrl: newNextPageUrl, pageUrl } = event.data;

  if (pageUrl !== currentPageUrl) {
    return;
  }

  if (isFirstPageLoading.value) {
    results.value = newResults || [];
    nextPageUrl.value = newNextPageUrl || null;
    isFirstPageEmpty.value = (newResults || []).length === 0;
    isFirstPageLoading.value = false;
  } else if (isNextPageLoading.value) {
    results.value.push(...(newResults || []));
    nextPageUrl.value = newNextPageUrl || null;
    isNextPageLoading.value = false;
  }
};

const doSearch = () => {
  const keyword = inputValue.value.trim();

  if (!keyword) {
    return;
  }

  resetSearchState();
  isFirstPageLoading.value = true;
  showHistory.value = false;

  currentPageUrl = BING_SITE_SEARCH_PREFIX + encodeURIComponent(keyword);
  loadIframe(currentPageUrl);
  saveToHistory(keyword);
};

const loadNextPage = () => {
  if (!nextPageUrl.value || isNextPageLoading.value) {
    return;
  }

  isNextPageLoading.value = true;
  currentPageUrl = nextPageUrl.value;

  const msg: FetchNextPageMessage = {
    type: IframeMessageType.GzkFetchNextPage,
    url: nextPageUrl.value,
  };

  iframeEl?.contentWindow?.postMessage(msg, '*');
};

const reloadPageData = () => {
  errorOccurred.value = false;

  if (currentPageUrl) {
    isNextPageLoading.value = true;
    loadIframe(currentPageUrl);
  }
};

const saveToHistory = async (keyword: string) => {
  const existingIndex = historyList.value.findIndex((item) => {
    return item.keyword === keyword;
  });

  if (existingIndex !== -1) {
    const oldId = historyList.value[existingIndex].id;
    await deleteSearchHistory(oldId);
    historyList.value.splice(existingIndex, 1);
  }

  const item: SearchHistoryItem = {
    id: crypto.randomUUID(),
    keyword,
    timestamp: Date.now(),
  };

  await addSearchHistory(item);
  historyList.value.unshift(item);
};

const removeHistory = async (id: string) => {
  await deleteSearchHistory(id);

  historyList.value = historyList.value.filter((item) => {
    return item.id !== id;
  });
};

const clearAllHistory = async () => {
  await clearSearchHistory();
  historyList.value = [];
};

const openInBing = () => {
  const keyword = inputValue.value.trim();

  if (!keyword) {
    return;
  }

  window.open(BING_SITE_SEARCH_PREFIX + encodeURIComponent(keyword), '_blank');
};

const handleFocus = async () => {
  isFocused.value = true;

  if (inputValue.value.trim() !== '') {
    showHistory.value = false;
    return;
  }

  showHistory.value = true;
  historyList.value = await getAllSearchHistory();
};

const handleClearInput = () => {
  inputValue.value = '';
  resetSearchState();
  showHistory.value = true;
};

const inputRef = ref<InstanceType<typeof ElInput>>();

const handleBlur = () => {
  setTimeout(() => {
    if (panelMousedown) {
      panelMousedown = false;
      inputRef.value?.focus();
      return;
    }

    if (document.activeElement?.closest('.gzk-search-panel')) {
      return;
    }

    closePanel();
  }, 150);
};

const handlePanelMousedown = (e: MouseEvent) => {
  panelMousedown = !!(e.target as HTMLElement).closest('.gzk-search-panel');
};

const handleInput = useDebounceFn(() => {
  const keyword = inputValue.value.trim();

  if (!keyword) {
    resetSearchState();
    showHistory.value = true;
    return;
  }

  doSearch();
}, 300);

const handleInputEnter = (e: Event) => {
  const ke = e as KeyboardEvent;
  ke.preventDefault();

  const keyword = inputValue.value.trim();

  if (keyword && results.value.length === 0 && !isFirstPageLoading.value) {
    doSearch();
    return;
  }

  if (highLightIndex.value >= 0 && results.value[highLightIndex.value]) {
    openResult();
  }
};

const handleRetry = () => {
  reloadPageData();
};

const handleHistoryClick = (keyword: string) => {
  inputValue.value = keyword;
  doSearch();
};
</script>

<template>
  <div class="gzk-search-wrapper">
    <ElInput
      ref="inputRef"
      v-model="inputValue"
      class="gzk-search-input"
      :placeholder="$t('search.placeholder')"
      @focus="handleFocus"
      @blur="handleBlur"
      @input="handleInput"
      @keydown="handleInputKeydown"
      @keydown.enter="handleInputEnter"
    >
      <template #prefix>
        <un-i-mdi-magnify class="gzk-search-icon" :title="$t('search.openInBing')" @mousedown.prevent="openInBing" />
      </template>
      <template #suffix>
        <un-i-mdi-close v-show="inputValue" class="gzk-search-clear-icon" @mousedown.prevent="handleClearInput" />
      </template>
    </ElInput>
    <div v-show="showPanel" class="gzk-search-panel">
      <ElScrollbar max-height="400px">
        <div
          v-infinite-scroll="loadNextPage"
          :infinite-scroll-disabled="disableNextPage"
          :infinite-scroll-distance="100"
        >
          <template v-if="showHistory && historyList.length > 0">
            <div class="gzk-search-history-header" @mousedown.prevent>
              <span>{{ $t('search.searchHistory') }}</span>
              <button class="gzk-search-clear-all-btn" @mousedown.prevent="clearAllHistory">
                {{ $t('search.clearAllHistory') }}
              </button>
            </div>
            <div
              v-for="item in historyList"
              :key="item.id"
              class="gzk-search-history-item"
              @mousedown.prevent="handleHistoryClick(item.keyword)"
            >
              <un-i-mdi-history class="gzk-search-history-item-icon" />
              <span class="gzk-search-history-item-text">{{ item.keyword }}</span>
              <button class="gzk-search-history-item-remove" @mousedown.prevent.stop="removeHistory(item.id)">
                <un-i-mdi-close />
              </button>
            </div>
          </template>
          <template v-else>
            <div
              v-for="(item, index) in results"
              :key="item.url"
              :class="['gzk-search-result-item', { 'is-highlighted': index === highLightIndex }]"
              @mouseenter="highLightIndex = index"
              @mousedown.prevent="openResult(item.url)"
              @keydown="handleResultKeydown($event, item.url)"
            >
              <div class="gzk-search-result-title">{{ item.title }}</div>
              <div class="gzk-search-result-description">{{ item.description }}</div>
            </div>
            <ElSkeleton v-show="isFirstPageLoading" class="gzk-search-skeleton" animated>
              <template #template>
                <ElSkeletonItem variant="text" />
                <ElSkeletonItem style="width: 60%" variant="text" />
                <ElSkeletonItem variant="text" />
                <ElSkeletonItem style="width: 60%" variant="text" />
                <ElSkeletonItem variant="text" />
                <ElSkeletonItem style="width: 60%" variant="text" />
              </template>
            </ElSkeleton>
            <ElSkeleton v-show="isNextPageLoading" class="gzk-search-skeleton" animated>
              <template #template>
                <ElSkeletonItem variant="text" />
                <ElSkeletonItem style="width: 60%" variant="text" />
              </template>
            </ElSkeleton>
            <ElEmpty v-show="isFirstPageEmpty" :description="$t('search.noResult')" />
            <div v-show="errorOccurred" class="gzk-search-error">
              <span>{{ $t('common.loadFailed') }}</span>
              <ElButton type="primary" size="small" @mousedown.prevent="handleRetry">
                {{ $t('common.loadFailedAndRetry') }}
              </ElButton>
            </div>
          </template>
        </div>
      </ElScrollbar>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gzk-search-wrapper {
  position: relative;
  display: inline-block;
  width: 200px;
  vertical-align: middle;

  .gzk-search-input {
    :deep(.el-input__wrapper) {
      background-color: var(--el-bg-color);
      border-color: var(--el-border-color);
    }

    :deep(.el-input__inner) {
      color: var(--el-text-color-primary);

      &::placeholder {
        color: var(--el-text-color-placeholder);
      }
    }
  }
}

.gzk-search-icon {
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--el-color-primary);
  }
}

.gzk-search-clear-icon {
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--el-text-color-secondary);
  }
}

.gzk-search-panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 2000;
  width: 400px;
  margin-top: 4px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-light);
}

.gzk-search-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.gzk-search-clear-all-btn {
  padding: 0;
  font-size: 12px;
  color: var(--el-color-info);
  cursor: pointer;
  background: none;
  border: none;

  &:hover {
    color: var(--el-color-primary);
  }
}

.gzk-search-history-item-icon {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.gzk-search-history-item-text {
  flex: 1;
  overflow: hidden;
  font-size: 14px;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gzk-search-history-item-remove {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  padding: 2px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  background: none;
  border: none;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;

  &:hover {
    color: var(--el-color-danger);
  }
}

.gzk-search-history-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: var(--el-fill-color-light);

    .gzk-search-history-item-remove {
      opacity: 1;
    }
  }
}

.gzk-search-result-item {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.2s;

  &:last-child {
    border-bottom: none;
  }

  &:hover,
  &.is-highlighted {
    background: var(--el-fill-color-light);
  }
}

.gzk-search-result-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gzk-search-result-description {
  display: -webkit-box;
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.gzk-search-skeleton {
  padding: 12px;
}

.gzk-search-error {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 16px;
  color: var(--el-text-color-secondary);
}
</style>
