<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { ElInput } from 'element-plus';

import { blurActiveElement } from '@/utils';
import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getAllSearchHistory,
} from '@/utils/search-history-store';
import { BING_SITE_SEARCH_PREFIX } from '@/constants';

import type { SearchHistoryItem } from '@/types';

const inputValue = ref('');
const isFocused = ref(false);
const highLightIndex = ref(-1);
const historyList = ref<SearchHistoryItem[]>([]);
const showHistory = ref(true);

let panelMousedown = false;

const showPanel = computed(() => {
  return isFocused.value && inputValue.value.trim() === '' && historyList.value.length > 0;
});

onMounted(() => {
  document.addEventListener('mousedown', handlePanelMousedown, true);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handlePanelMousedown, true);
});

const stepDirection = (direction: 'up' | 'down') => {
  const maxIndex = historyList.value.length - 1;

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

const closePanel = () => {
  isFocused.value = false;
  highLightIndex.value = -1;
  blurActiveElement();
};

const doSearch = (keyword: string) => {
  if (!keyword) {
    return;
  }

  window.open(BING_SITE_SEARCH_PREFIX + encodeURIComponent(keyword), '_blank');
  saveToHistory(keyword);
};

const handleInputKeydown = (e: Event) => {
  const ke = e as KeyboardEvent;

  if (!showPanel.value) {
    return;
  }

  switch (ke.key) {
    case 'ArrowDown':
      ke.preventDefault();
      stepDirection('down');
      break;
    case 'ArrowUp':
      ke.preventDefault();
      stepDirection('up');
      break;
    case 'Escape':
      ke.preventDefault();
      closePanel();
      break;
  }
};

const handleInputEnter = (e: Event) => {
  const ke = e as KeyboardEvent;
  ke.preventDefault();

  if (highLightIndex.value >= 0 && historyList.value[highLightIndex.value]) {
    const keyword = historyList.value[highLightIndex.value].keyword;
    doSearch(keyword);
    return;
  }

  const keyword = inputValue.value.trim();

  if (!keyword) {
    return;
  }

  doSearch(keyword);
};

const handleSearchClick = () => {
  const keyword = inputValue.value.trim();

  if (!keyword) {
    return;
  }

  doSearch(keyword);
};

const handleHistoryClick = (keyword: string) => {
  doSearch(keyword);
};

const handleHistoryItemKeydown = (e: Event, keyword: string) => {
  const ke = e as KeyboardEvent;

  if (ke.key === 'Enter') {
    ke.preventDefault();
    doSearch(keyword);
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
      @keydown="handleInputKeydown"
      @keydown.enter="handleInputEnter"
    >
      <template #prefix>
        <un-i-mdi-magnify class="gzk-search-icon" @mousedown.prevent="handleSearchClick" />
      </template>
      <template #suffix>
        <un-i-mdi-close v-show="inputValue" class="gzk-search-clear-icon" @mousedown.prevent="handleClearInput" />
      </template>
    </ElInput>
    <div v-show="showPanel" class="gzk-search-panel">
      <div class="gzk-search-history-header" @mousedown.prevent>
        <span>{{ $t('search.searchHistory') }}</span>
        <button class="gzk-search-clear-all-btn" @mousedown.prevent="clearAllHistory">
          {{ $t('search.clearAllHistory') }}
        </button>
      </div>
      <ElScrollbar max-height="300px">
        <div
          v-for="(item, index) in historyList"
          :key="item.id"
          :class="['gzk-search-history-item', { 'is-highlighted': index === highLightIndex }]"
          @mousedown.prevent="handleHistoryClick(item.keyword)"
          @mouseenter="highLightIndex = index"
          @keydown="handleHistoryItemKeydown($event, item.keyword)"
        >
          <un-i-mdi-history class="gzk-search-history-item-icon" />
          <span class="gzk-search-history-item-text" :title="item.keyword">{{ item.keyword }}</span>
          <button class="gzk-search-history-item-remove" @mousedown.prevent.stop="removeHistory(item.id)">
            <un-i-mdi-close />
          </button>
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
  width: 100%;
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

  &.is-highlighted {
    background: var(--el-fill-color-light);
  }
}
</style>
