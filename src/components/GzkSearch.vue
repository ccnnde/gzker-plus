<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import { useReplyFocus } from '@/composables/reply-focus';
import { useSearchFilters } from '@/composables/search-filters';
import { useSearchTrigger } from '@/composables/search-trigger';
import { t } from '@/i18n';
import { getSearchNodeOptions, searchTopic } from '@/api';
import { checkMacOS } from '@/utils';
import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getAllSearchHistory,
} from '@/utils/search-history-store';
import { INFINITE_SCROLL_LOAD_DISTANCE, SearchScope, topicLinkRegExp } from '@/constants';
import { SEARCH_FILTER_INJECTION_KEY } from '@/constants/inject-key';

import ElementConfig from './ElementConfig.vue';
import GzkSearchFilter from './GzkSearchFilter.vue';
import GzkSearchResultItem from './GzkSearchResultItem.vue';
import LoadError from './LoadError.vue';

import type { InputInstance, ScrollbarDirection, ScrollbarInstance, TabsPaneContext } from 'element-plus';
import type { SearchHistoryItem, SearchNodeOption, SearchParams, SearchTopicItem } from '@/types';

const MAX_HISTORY_NUMBER = 20;
const SEARCH_ARROW_SCROLL_DISTANCE = 50;
const SEARCH_PAGE_SCROLL_RATIO = 0.9;

const isOpen = ref(false);
const query = ref('');
const submittedQuery = ref('');
const historyList = ref<SearchHistoryItem[]>([]);
const resultList = ref<SearchTopicItem[]>([]);
const nodeOptions = ref<SearchNodeOption[]>([]);
const activeIndex = ref(-1);
const nextPage = ref<number>();
const elapsedMilliseconds = ref<number>();
const emptyMessage = ref('');
const notice = ref('');
const errorMessage = ref('');
const isSearching = ref(false);
const isLoadingMore = ref(false);
const areNodesLoading = ref(false);
const inputRef = ref<InputInstance>();
const contentRef = ref<ScrollbarInstance>();

const searchFilters = useSearchFilters();
const { filters, getFilterKey, getSearchParams, validateDateRange, resetFilterValues } = searchFilters;

provide(SEARCH_FILTER_INJECTION_KEY, searchFilters);

const shortcutLabel = checkMacOS() ? '⌘' : 'Ctrl';
const isTopicPage = topicLinkRegExp.test(window.location.pathname);
const isResultMode = computed(() => submittedQuery.value !== '');

const searchPlaceholderKey = computed(() => {
  switch (filters.scope) {
    case SearchScope.Title:
      return 'search.placeholderTitle';
    case SearchScope.Topic:
      return 'search.placeholderTopic';
    case SearchScope.Reply:
      return 'search.placeholderReply';
    default:
      return 'search.placeholder';
  }
});

const resultStats = computed(() => {
  const count = resultList.value.length;

  if (elapsedMilliseconds.value === undefined) {
    return t('search.resultCount', { count });
  }

  return t('search.resultStats', { count, elapsed: elapsedMilliseconds.value });
});

let submittedFilterKey = '';
let submittedParams: SearchParams | undefined;
let searchController: AbortController | undefined;
let nextPageController: AbortController | undefined;
let nodesController: AbortController | undefined;

const isSearchDirty = computed(() => {
  const keyword = query.value.trim();

  if (!keyword) {
    return false;
  }

  return keyword !== submittedQuery.value || getFilterKey() !== submittedFilterKey || errorMessage.value !== '';
});

const focusInput = async () => {
  await nextTick();
  inputRef.value?.focus();
};

const loadHistory = async () => {
  historyList.value = await getAllSearchHistory();
  activeIndex.value = -1;
};

const loadNodeOptions = async () => {
  if (nodeOptions.value.length > 0 || areNodesLoading.value) {
    return;
  }

  nodesController?.abort();
  nodesController = new AbortController();
  areNodesLoading.value = true;

  try {
    nodeOptions.value = await getSearchNodeOptions(nodesController.signal);
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error(err);
    }
  } finally {
    areNodesLoading.value = false;
  }
};

const openDialog = async () => {
  if (!isOpen.value) {
    isOpen.value = true;
    setTriggerExpanded(true);
    await loadHistory();
    loadNodeOptions();
  }

  await focusInput();
};

const resetSearchState = () => {
  query.value = '';
  submittedQuery.value = '';
  submittedParams = undefined;
  submittedFilterKey = '';
  resultList.value = [];
  activeIndex.value = -1;
  nextPage.value = undefined;
  elapsedMilliseconds.value = undefined;
  emptyMessage.value = '';
  notice.value = '';
  errorMessage.value = '';
  isSearching.value = false;
  isLoadingMore.value = false;
  filters.scope = SearchScope.All;
  resetFilterValues();
};

const closeDialog = () => {
  searchController?.abort();
  nextPageController?.abort();
  searchController = undefined;
  nextPageController = undefined;
  isOpen.value = false;
  resetSearchState();
  setTriggerExpanded(false);
};

const saveToHistory = async (keyword: string) => {
  const duplicateItems = historyList.value.filter((item) => item.keyword === keyword);

  await Promise.all(duplicateItems.map((item) => deleteSearchHistory(item.id)));

  const item: SearchHistoryItem = {
    id: crypto.randomUUID(),
    keyword,
    timestamp: Date.now(),
  };

  await addSearchHistory(item);

  const remainingItems = historyList.value.filter((historyItem) => historyItem.keyword !== keyword);
  const nextHistoryList = [item, ...remainingItems];
  const removedItems = nextHistoryList.slice(MAX_HISTORY_NUMBER);

  await Promise.all(removedItems.map((historyItem) => deleteSearchHistory(historyItem.id)));
  historyList.value = nextHistoryList.slice(0, MAX_HISTORY_NUMBER);
};

const performSearch = async (keyword: string, saveHistory: boolean = true) => {
  const normalizedKeyword = keyword.trim();

  if (!normalizedKeyword || !validateDateRange()) {
    return;
  }

  searchController?.abort();
  nextPageController?.abort();

  const controller = new AbortController();
  const params = getSearchParams(normalizedKeyword);
  searchController = controller;
  submittedParams = params;
  submittedFilterKey = getFilterKey();
  query.value = normalizedKeyword;
  submittedQuery.value = normalizedKeyword;
  inputRef.value?.blur();
  resultList.value = [];
  activeIndex.value = -1;
  nextPage.value = undefined;
  elapsedMilliseconds.value = undefined;
  emptyMessage.value = '';
  notice.value = '';
  errorMessage.value = '';
  isSearching.value = true;

  try {
    const result = await searchTopic(params, controller.signal);

    if (controller.signal.aborted) {
      return;
    }

    resultList.value = result.list;
    nextPage.value = result.nextPage;
    elapsedMilliseconds.value = result.elapsedMilliseconds;
    emptyMessage.value = result.emptyMessage || '';
    notice.value = result.notice || '';

    if (saveHistory) {
      await saveToHistory(normalizedKeyword);
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error(err);
      errorMessage.value = t('common.loadFailedAndRetry');
    }
  } finally {
    if (searchController === controller) {
      isSearching.value = false;
    }
  }
};

const applyFilters = (force: boolean = false) => {
  const keyword = query.value.trim();

  if (!keyword) {
    return;
  }

  const filterKey = getFilterKey();

  if (!force && keyword === submittedQuery.value && filterKey === submittedFilterKey && !errorMessage.value) {
    return;
  }

  performSearch(keyword, keyword !== submittedQuery.value);
};

const handleScopeClick = (pane: TabsPaneContext) => {
  filters.scope = pane.props.name as SearchScope;
  applyFilters(true);
};

const resetFilters = () => {
  resetFilterValues();
  applyFilters();
};

const submitSearch = () => {
  if (!query.value.trim()) {
    ElMessage({
      message: t('search.enterKeyword'),
      type: 'warning',
    });
    focusInput();
    return;
  }

  performSearch(query.value);
};

const loadNextPage = async () => {
  const page = nextPage.value;

  if (!page || !submittedParams || isSearching.value || isLoadingMore.value) {
    return;
  }

  const controller = new AbortController();
  nextPageController = controller;
  errorMessage.value = '';
  isLoadingMore.value = true;

  try {
    const result = await searchTopic(
      {
        ...submittedParams,
        p: page,
      },
      controller.signal,
    );

    if (controller.signal.aborted) {
      return;
    }

    resultList.value.push(...result.list);
    nextPage.value = result.nextPage;

    if (result.elapsedMilliseconds !== undefined) {
      elapsedMilliseconds.value = result.elapsedMilliseconds;
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error(err);
      errorMessage.value = t('common.loadFailedAndRetry');
    }
  } finally {
    if (nextPageController === controller) {
      isLoadingMore.value = false;
    }
  }
};

const retrySearch = () => {
  if (resultList.value.length > 0 && nextPage.value) {
    loadNextPage();
    return;
  }

  performSearch(submittedQuery.value || query.value);
};

const searchHistoryItem = (item: SearchHistoryItem) => {
  performSearch(item.keyword);
};

const removeHistory = async (event: Event, id: string) => {
  event.stopPropagation();
  await deleteSearchHistory(id);
  historyList.value = historyList.value.filter((item) => item.id !== id);
  activeIndex.value = -1;
};

const clearAllHistory = async () => {
  await clearSearchHistory();
  historyList.value = [];
  activeIndex.value = -1;
};

const clearInput = () => {
  searchController?.abort();
  nextPageController?.abort();
  query.value = '';
  submittedQuery.value = '';
  submittedParams = undefined;
  resultList.value = [];
  nextPage.value = undefined;
  elapsedMilliseconds.value = undefined;
  emptyMessage.value = '';
  notice.value = '';
  errorMessage.value = '';
  activeIndex.value = -1;
  focusInput();
};

const stepActiveItem = (direction: 'up' | 'down') => {
  const itemNumber = historyList.value.length;

  if (itemNumber === 0) {
    activeIndex.value = -1;
    return;
  }

  let nextIndex: number;

  if (activeIndex.value < 0) {
    nextIndex = direction === 'down' ? 0 : itemNumber - 1;
  } else if (direction === 'down') {
    nextIndex = (activeIndex.value + 1) % itemNumber;
  } else {
    nextIndex = (activeIndex.value - 1 + itemNumber) % itemNumber;
  }

  const historyItem = historyList.value[nextIndex];

  if (!historyItem) {
    activeIndex.value = -1;
    return;
  }

  activeIndex.value = nextIndex;
  query.value = historyItem.keyword;
  focusInput();
};

const selectActiveHistoryItem = () => {
  const historyItem = historyList.value[activeIndex.value];

  if (historyItem) {
    searchHistoryItem(historyItem);
  }
};

const activateHistoryItem = (index: number) => {
  activeIndex.value = index;
};

const isSearchInputTarget = (target: EventTarget | null): target is HTMLInputElement => {
  return target instanceof HTMLInputElement && Boolean(target.closest('.gzkp-search-dialog__input'));
};

const shouldIgnoreHistoryShortcut = (event: KeyboardEvent): boolean => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (isSearchInputTarget(target)) {
    return event.shiftKey;
  }

  return Boolean(target.closest('input, textarea, button, [contenteditable="true"], .gzkp-search-tools, .el-popper'));
};

const handleHistoryKeyboard = (event: KeyboardEvent) => {
  if (shouldIgnoreHistoryShortcut(event)) {
    return;
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      stepActiveItem('down');
      break;
    case 'ArrowUp':
      event.preventDefault();
      stepActiveItem('up');
      break;
    case 'Enter':
      event.preventDefault();

      if (isSearchDirty.value) {
        performSearch(query.value);
      } else {
        selectActiveHistoryItem();
      }

      break;
  }
};

const handleResultScrollEnd = (direction: ScrollbarDirection) => {
  if (direction !== 'bottom' || !isResultMode.value) {
    return;
  }

  loadNextPage();
};

const shouldIgnoreResultScroll = (event: KeyboardEvent): boolean => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (isSearchInputTarget(target)) {
    return event.shiftKey || event.key === ' ' || event.key === 'Home' || event.key === 'End';
  }

  return Boolean(target.closest('input, textarea, button, [contenteditable="true"], .gzkp-search-tools, .el-popper'));
};

const handleResultKeyboardScroll = (event: KeyboardEvent) => {
  if ((event.shiftKey && event.key !== ' ') || shouldIgnoreResultScroll(event)) {
    return;
  }

  const scrollElement = contentRef.value?.wrapRef;

  if (!scrollElement) {
    return;
  }

  const pageScrollDistance = scrollElement.clientHeight * SEARCH_PAGE_SCROLL_RATIO;
  let scrollOptions: ScrollToOptions | undefined;

  switch (event.key) {
    case 'Home':
      scrollOptions = { top: 0 };
      break;
    case 'End':
      scrollOptions = { top: scrollElement.scrollHeight };
      break;
    case 'PageUp':
      scrollOptions = { top: -pageScrollDistance };
      break;
    case 'PageDown':
      scrollOptions = { top: pageScrollDistance };
      break;
    case 'ArrowUp':
      scrollOptions = { top: -SEARCH_ARROW_SCROLL_DISTANCE };
      break;
    case 'ArrowDown':
      scrollOptions = { top: SEARCH_ARROW_SCROLL_DISTANCE };
      break;
    case ' ':
      scrollOptions = { top: event.shiftKey ? -pageScrollDistance : pageScrollDistance };
      break;
    default:
      return;
  }

  event.preventDefault();

  if (event.key === 'Home' || event.key === 'End') {
    scrollElement.scrollTo({ ...scrollOptions, behavior: 'smooth' });
  } else {
    scrollElement.scrollBy({ ...scrollOptions, behavior: 'smooth' });
  }
};

const handleDialogKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (event.key === 'Enter' && isSearchInputTarget(event.target)) {
    event.preventDefault();
    submitSearch();
    return;
  }

  if (isResultMode.value) {
    handleResultKeyboardScroll(event);
  } else {
    handleHistoryKeyboard(event);
  }
};

const hasVisibleBlockingOverlay = (): boolean => {
  return [...document.querySelectorAll<HTMLElement>('.el-overlay')].some((overlayElement) => {
    const isTopicPageOverlay = overlayElement.classList.contains('gzkp-topic-overlay');
    const isSearchOverlay = Boolean(overlayElement.querySelector('.gzkp-search-dialog'));
    return overlayElement.style.display !== 'none' && !isTopicPageOverlay && !isSearchOverlay;
  });
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
  const hasSingleSystemModifier = event.ctrlKey !== event.metaKey;
  const isSearchShortcut =
    hasSingleSystemModifier && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';

  if (isSearchShortcut) {
    if (hasVisibleBlockingOverlay()) {
      return;
    }

    event.preventDefault();
    openDialog();
    return;
  }

  handleDialogKeydown(event);
};

const { setTriggerExpanded } = useSearchTrigger({
  shortcutLabel,
  onOpen: () => {
    openDialog();
  },
});

useReplyFocus();

watch(activeIndex, async () => {
  await nextTick();
  contentRef.value?.wrapRef?.querySelector('.gzkp-search-item-active')?.scrollIntoView({ block: 'nearest' });
});

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  searchController?.abort();
  nextPageController?.abort();
  nodesController?.abort();
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <ElementConfig>
    <ElDialog
      v-model="isOpen"
      class="gzkp-search-dialog"
      append-to-body
      :modal-class="isTopicPage ? 'gzkp-search-overlay--topic-page' : ''"
      :show-close="false"
      @close="closeDialog"
    >
      <template #header>
        <header class="gzkp-search-dialog__header">
          <ElInput
            ref="inputRef"
            v-model="query"
            class="gzkp-search-dialog__input"
            :placeholder="$t(searchPlaceholderKey)"
            maxlength="120"
            size="large"
          >
            <template #prefix>
              <ElButton
                class="gzkp-search-dialog__submit"
                text
                circle
                :aria-label="$t('search.shortPlaceholder')"
                @click="submitSearch"
              >
                <un-i-mdi-magnify class="gzkp-search-dialog__search-icon" />
              </ElButton>
            </template>
            <template #suffix>
              <ElButton
                v-if="query"
                class="gzkp-search-dialog__clear"
                text
                circle
                size="small"
                :aria-label="$t('search.clearInput')"
                @click="clearInput"
              >
                <un-i-mdi-close />
              </ElButton>
            </template>
          </ElInput>
        </header>
      </template>
      <div class="gzkp-search-tools">
        <ElTabs v-model="filters.scope" class="gzkp-search-scope-tabs" @tab-click="handleScopeClick">
          <ElTabPane :name="SearchScope.All" :label="$t('search.tabAll')" />
          <ElTabPane :name="SearchScope.Title" :label="$t('search.tabTitle')" />
          <ElTabPane :name="SearchScope.Topic" :label="$t('search.tabTopic')" />
          <ElTabPane :name="SearchScope.Reply" :label="$t('search.tabReply')" />
        </ElTabs>
        <GzkSearchFilter
          :open="isOpen"
          :node-options="nodeOptions"
          :nodes-loading="areNodesLoading"
          @change="applyFilters()"
          @reset="resetFilters"
        />
      </div>
      <ElScrollbar
        ref="contentRef"
        class="gzkp-search-content"
        :distance="INFINITE_SCROLL_LOAD_DISTANCE"
        always
        @end-reached="handleResultScrollEnd"
      >
        <template v-if="!isResultMode">
          <div v-if="historyList.length > 0" class="gzkp-search-content__header">
            <span class="gzkp-search-content__title">
              {{ $t('search.searchHistory') }}
            </span>
            <div class="gzkp-search-content__actions">
              <ElButton
                class="gzkp-search-history__clear-all"
                text
                circle
                size="small"
                :aria-label="$t('search.clearAllHistory')"
                @click="clearAllHistory"
              >
                <un-i-mdi-trash-can-outline />
              </ElButton>
            </div>
          </div>
          <div v-if="historyList.length > 0" class="gzkp-search-history">
            <div
              v-for="(item, index) in historyList"
              :key="item.id"
              :class="['gzkp-search-history__item', { 'gzkp-search-item-active': index === activeIndex }]"
              role="button"
              tabindex="0"
              @click="searchHistoryItem(item)"
              @focus="activateHistoryItem(index)"
            >
              <un-i-mdi-history class="gzkp-search-history__icon" />
              <span class="gzkp-search-history__main">
                <span class="gzkp-search-history__query">{{ item.keyword }}</span>
              </span>
              <ElButton
                class="gzkp-search-history__remove"
                text
                circle
                size="small"
                :aria-label="$t('search.deleteHistory', { keyword: item.keyword })"
                @click="removeHistory($event, item.id)"
              >
                <un-i-mdi-close />
              </ElButton>
            </div>
          </div>
          <ElEmpty v-else class="gzkp-search-empty" :description="$t('search.emptyHistory')" :image-size="64" />
        </template>
        <template v-else>
          <div
            v-if="isSearching"
            v-loading="isSearching"
            class="gzkp-search-state"
            element-loading-custom-class="gzkp-loading-ring"
          ></div>
          <LoadError
            v-else-if="errorMessage"
            class="gzkp-search-load-error"
            :error-text="errorMessage"
            @retry="retrySearch"
          />
          <ElEmpty
            v-else-if="resultList.length === 0"
            class="gzkp-search-empty"
            :description="emptyMessage || notice || $t('search.noResults')"
            :image-size="64"
          />
          <div v-else class="gzkp-search-results">
            <GzkSearchResultItem
              v-for="(item, index) in resultList"
              :key="item.replyId ? `reply-${item.replyId}` : `topic-${item.topicId}-${index}`"
              :item="item"
            />
            <ElSkeleton v-if="isLoadingMore" class="gzkp-search-result-loading" aria-hidden="true" animated>
              <template #template>
                <div class="gzkp-search-result-loading__content">
                  <ElSkeletonItem class="gzkp-search-result-loading__line" variant="text" />
                  <ElSkeletonItem class="gzkp-search-result-loading__line" variant="text" />
                  <ElSkeletonItem
                    class="gzkp-search-result-loading__line gzkp-search-result-loading__line--short"
                    variant="text"
                  />
                </div>
              </template>
            </ElSkeleton>
            <div v-else-if="!nextPage" class="gzkp-search-results__end">
              {{ $t('search.noMoreResults') }}
            </div>
          </div>
        </template>
      </ElScrollbar>
      <template #footer>
        <footer class="gzkp-search-footer">
          <span v-if="isResultMode" class="gzkp-search-footer__stats">{{ resultStats }}</span>
          <template v-else>
            <span class="gzkp-search-footer__hint">
              <kbd class="gzkp-search-keycap gzkp-search-keycap--icon">
                <un-i-mdi-arrow-up />
              </kbd>
              <kbd class="gzkp-search-keycap gzkp-search-keycap--icon">
                <un-i-mdi-arrow-down />
              </kbd>
              <span>{{ $t('search.navigate') }}</span>
            </span>
            <span class="gzkp-search-footer__hint">
              <kbd class="gzkp-search-keycap gzkp-search-keycap--icon">
                <un-i-mdi-keyboard-return />
              </kbd>
              <span>{{ $t('search.confirm') }}</span>
            </span>
            <span class="gzkp-search-footer__hint">
              <kbd class="gzkp-search-keycap">ESC</kbd>
              <span>{{ $t('search.close') }}</span>
            </span>
          </template>
          <span class="gzkp-search-footer__spacer"></span>
          <span class="gzkp-search-footer__hint">
            <kbd class="gzkp-search-keycap">{{ shortcutLabel }}</kbd>
            <kbd class="gzkp-search-keycap">K</kbd>
          </span>
        </footer>
      </template>
    </ElDialog>
  </ElementConfig>
</template>

<style lang="scss" scoped>
@import '@/styles/mixin';

:global(.gzkp-search-overlay--topic-page > .el-overlay-dialog) {
  top: var(--gzkp-top-navbar-height, 52px);
}

:global(.gzkp-search-dialog.el-dialog) {
  --el-dialog-padding-primary: 0px;

  position: absolute !important;
  top: 50%;
  left: 50%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 40%;

  @include dynamic-width(50%, 55%, 60%, 65%, 70%, 75%, 80%, 85%);

  height: 560px;
  max-height: none !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden;
  color: var(--el-text-color-primary);
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter) !important;
  border-radius: 10px !important;
  box-shadow: 0 18px 54px rgb(15 28 40 / 24%);
  transform: translate(-50%, -50%);
}

:global(.gzkp-search-dialog.el-dialog > .el-dialog__header) {
  padding: 0 !important;
  margin: 0 !important;
}

:global(.gzkp-search-dialog.el-dialog > .el-dialog__body) {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden;
  color: var(--el-text-color-primary);
}

:global(.gzkp-search-dialog.el-dialog > .el-dialog__footer) {
  padding: 0 !important;
  margin: 0 !important;
}

.gzkp-search-dialog__header {
  display: flex;
  align-items: center;
  min-height: 58px;
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.gzkp-search-dialog__submit {
  width: 36px;
  height: 36px;
  margin-left: -6px;
  color: var(--el-text-color-secondary);
}

.gzkp-search-dialog__search-icon {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  color: var(--el-text-color-secondary);
}

.gzkp-search-dialog__input {
  width: 100%;

  :deep(.el-input__wrapper) {
    padding-inline: 0;
    background: transparent;
    border-radius: 0;
    box-shadow: none !important;
  }

  :deep(.el-input__inner) {
    height: 48px;
    font-size: 16px;
  }
}

.gzkp-search-dialog__clear {
  font-size: 16px;
}

.gzkp-search-tools {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  min-height: 44px;
  padding: 0 14px 0 10px;
  background: var(--el-bg-color-overlay);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.gzkp-search-scope-tabs {
  flex: 1 1 auto;
  min-width: 0;

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__active-bar) {
    display: none;
  }

  :deep(.el-tabs__item) {
    height: 44px;
    padding: 0 14px !important;
    font-size: 14px;
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  :deep(.el-tabs__item:hover) {
    color: var(--el-text-color-primary);
  }

  :deep(.el-tabs__item.is-active) {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  :deep(.el-tabs__content) {
    display: none;
  }
}

.gzkp-search-content__header {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  min-height: 48px;
  padding: 8px 16px 8px 26px;
}

.gzkp-search-content__title {
  min-width: 0;
  font-size: var(--el-font-size-base);
  font-weight: 400;
  line-height: 1.5;
  color: var(--el-text-color-primary);
}

.gzkp-search-content__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.gzkp-search-history__clear-all {
  width: 28px;
  height: 28px;
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  background: transparent;
  border-radius: 50%;
  transition: color 120ms ease;

  &.el-button.is-text:not(.is-disabled) {
    &:hover,
    &:focus-visible {
      color: var(--el-text-color-primary);
      background-color: transparent !important;
    }
  }
}

.gzkp-search-content {
  flex: 1 1 0;
  height: 0;
  min-height: 0;
  max-height: none;

  :deep(.el-scrollbar__wrap) {
    overscroll-behavior: contain;
  }

  :deep(.el-scrollbar__view) {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100%;
  }
}

.gzkp-search-history,
.gzkp-search-results {
  display: grid;
  flex: 0 0 auto;
  gap: 2px;
  min-width: 0;
}

.gzkp-search-history {
  gap: 0;
  padding: 0 16px 12px 14px;
}

.gzkp-search-results {
  padding: 0 10px 16px;
}

.gzkp-search-history__item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 42px;
  padding: 4px 0 4px 12px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 9px;
  transition: background 120ms ease;

  &:hover,
  &.gzkp-search-item-active {
    background: var(--el-fill-color-light);
  }
}

.gzkp-search-history__icon {
  width: 16px;
  height: 16px;
  color: var(--el-text-color-secondary);
}

.gzkp-search-history__main {
  display: block;
  min-width: 0;
}

.gzkp-search-history__query {
  display: block;
  overflow: hidden;
  font-size: 14px;
  font-weight: 400;
  color: var(--el-text-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gzkp-search-history__remove {
  width: 28px;
  height: 28px;
  font-size: 15px;
  color: var(--el-text-color-secondary);
  background: transparent;
  border-radius: 50%;
  transition: color 120ms ease;

  &.el-button.is-text:not(.is-disabled) {
    &:hover,
    &:focus-visible {
      color: var(--el-text-color-primary);
      background-color: transparent !important;
    }
  }
}

.gzkp-search-empty {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}

.gzkp-search-state {
  display: grid;
  flex: 1 1 auto;
  gap: 10px;
  place-items: center;
  align-content: center;
  min-height: 0;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.gzkp-search-load-error {
  flex: 1 1 auto;
  height: auto !important;
  min-height: 0;
}

.gzkp-search-result-loading {
  box-sizing: border-box;
  padding: 13px 14px 20px;
  overflow: hidden;
  overflow-anchor: none;
}

.gzkp-search-result-loading__content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gzkp-search-result-loading__line {
  height: 12px;
}

.gzkp-search-result-loading__line--short {
  width: 23%;
}

.gzkp-search-results__end {
  display: grid;
  place-items: center;
  min-height: 28px;
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}

.gzkp-search-footer {
  display: flex;
  gap: 16px;
  align-items: center;
  min-height: 44px;
  padding: 0 20px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color-overlay);
  border-top: 1px solid var(--el-border-color-lighter);
}

.gzkp-search-footer__hint {
  display: flex;
  gap: 6px;
  align-items: center;
}

.gzkp-search-footer__stats {
  color: var(--el-text-color-secondary);
}

.gzkp-search-footer__spacer {
  flex: 1;
}

.gzkp-search-keycap {
  box-sizing: border-box;
  display: inline-grid;
  place-items: center;
  min-width: 17px;
  height: auto;
  padding: 2px 5px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  box-shadow: none;
}

.gzkp-search-keycap--icon {
  width: auto;
  font-size: 13px;
}

@media (prefers-reduced-motion: reduce) {
  .gzkp-search-result-loading.is-animated :deep(.el-skeleton__item) {
    animation: none;
  }
}

@media (width <= 479px) {
  .gzkp-search-keycap,
  .gzkp-search-footer {
    display: none;
  }

  :global(.gzkp-search-overlay--topic-page > .el-overlay-dialog) {
    top: 0;
  }

  :global(.gzkp-search-dialog.el-dialog) {
    inset: 0;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    transform: none;
  }

  .gzkp-search-content__header {
    gap: 8px;
    padding-inline: 16px;
  }

  .gzkp-search-content__actions {
    gap: 8px;
  }

  .gzkp-search-tools {
    padding-inline: 12px;
  }

  .gzkp-search-scope-tabs {
    :deep(.el-tabs__item) {
      padding-inline: 10px !important;
    }
  }

  .gzkp-search-content {
    max-height: none;
  }
}
</style>
