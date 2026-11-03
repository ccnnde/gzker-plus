<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { SEARCH_FILTER_INJECTION_KEY } from '@/constants/inject-key';

import type { InputInstance } from 'element-plus';
import type { SearchSort, SearchTimePreset } from '@/constants';
import type { SearchDateField, SearchNodeOption } from '@/types';

interface Props {
  open: boolean;
  nodeOptions: SearchNodeOption[];
  nodesLoading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  change: [];
  reset: [];
}>();

const FILTER_CLOSE_DELAY = 160;

const controller = inject(SEARCH_FILTER_INJECTION_KEY);

if (!controller) {
  throw new Error('Search filters controller is not provided');
}

const { filters, timePreset, sortOptions, timeOptions, activeFilterCount } = controller;
const { applyTimePreset, updateDateRange, disabledStartDate, disabledEndDate } = controller;
const authorInputRef = ref<InputInstance>();
const nodeGroupRef = ref<HTMLElement>();
const isPopoverVisible = ref(false);
const suppressHover = ref(false);
const nodeDropdownMaxHeight = ref<number>();
let closeTimer: number | undefined;

const nodeGroupStyle = computed(() => {
  if (nodeDropdownMaxHeight.value === undefined) {
    return undefined;
  }

  return { '--gzk-node-dropdown-max-height': `${nodeDropdownMaxHeight.value}px` };
});

const commitAuthor = () => {
  filters.author = filters.author.trim();
  emit('change');
};

const handleAuthorEnter = () => {
  commitAuthor();
  authorInputRef.value?.blur();
};

const handleAuthorClear = async () => {
  await nextTick();
  commitAuthor();
};

const handleSortChange = (sort: SearchSort) => {
  filters.sort = sort;
  emit('change');
};

const handleNodeChange = (node: unknown) => {
  filters.node = typeof node === 'number' ? node : 0;
  emit('change');
};

const syncNodeDropdownHeight = () => {
  const groupEl = nodeGroupRef.value;
  const wrapEl = groupEl?.querySelector<HTMLElement>('.el-select-dropdown__wrap');
  const popoverEl = groupEl?.closest<HTMLElement>('.gzk-search-filter-popover');

  if (!groupEl || !wrapEl || !popoverEl) {
    return;
  }

  const popoverRect = popoverEl.getBoundingClientRect();
  const wrapRect = wrapEl.getBoundingClientRect();
  const sideGap = wrapRect.left - popoverRect.left;

  nodeDropdownMaxHeight.value = Math.max(popoverRect.bottom - wrapRect.top - sideGap, 0);
};

const handleNodeDropdownVisible = async (visible: boolean) => {
  if (!visible) {
    return;
  }

  await nextTick();
  requestAnimationFrame(() => {
    syncNodeDropdownHeight();
  });
};

const handleTimePresetChange = (preset: SearchTimePreset) => {
  applyTimePreset(preset);
  emit('change');
};

const handleDateChange = (field: SearchDateField, value: unknown) => {
  if (!updateDateRange(field, value)) {
    return;
  }

  emit('change');
};

const handleDateRangeClick = (event: MouseEvent) => {
  if (!(event.currentTarget instanceof HTMLElement) || !(event.target instanceof Element)) {
    return;
  }

  if (event.target.closest('.el-input, .el-picker-panel')) {
    return;
  }

  const startInput = event.currentTarget.querySelector<HTMLInputElement>('input');
  startInput?.focus();
  startInput?.click();
};

const resetPopover = () => {
  window.clearTimeout(closeTimer);
  closeTimer = undefined;
  isPopoverVisible.value = false;
  suppressHover.value = false;
};

const closeFilterPanel = (suppress: boolean = false) => {
  window.clearTimeout(closeTimer);
  closeTimer = undefined;
  isPopoverVisible.value = false;
  suppressHover.value = suppress;
  commitAuthor();
  authorInputRef.value?.blur();
};

const handleFilterEnter = () => {
  if (suppressHover.value) {
    return;
  }

  window.clearTimeout(closeTimer);
  closeTimer = undefined;
  isPopoverVisible.value = true;
};

const handleFilterLeave = () => {
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    isPopoverVisible.value = false;
    commitAuthor();
    authorInputRef.value?.blur();
    suppressHover.value = false;
  }, FILTER_CLOSE_DELAY);
};

const handleOutsideClick = (event: MouseEvent) => {
  if (!isPopoverVisible.value || !(event.target instanceof HTMLElement)) {
    return;
  }

  if (event.target.closest('.gzk-search-filter-trigger, .gzk-search-filter-popover')) {
    return;
  }

  closeFilterPanel();
};

const handleEscape = (event: KeyboardEvent) => {
  if (
    event.key !== 'Escape' ||
    !isPopoverVisible.value ||
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  closeFilterPanel(true);
};

const handleReset = () => {
  emit('reset');
};

watch(
  () => props.open,
  (open) => {
    if (!open) {
      resetPopover();
    }
  },
);

onMounted(() => {
  document.addEventListener('mousedown', handleOutsideClick);
  document.addEventListener('keydown', handleEscape, true);
});

onUnmounted(() => {
  window.clearTimeout(closeTimer);
  document.removeEventListener('mousedown', handleOutsideClick);
  document.removeEventListener('keydown', handleEscape, true);
});
</script>

<template>
  <ElPopover
    :visible="isPopoverVisible"
    :width="380"
    :offset="8"
    placement="bottom-end"
    popper-class="gzk-search-filter-popover"
    :show-arrow="false"
    persistent
  >
    <template #reference>
      <ElButton
        :class="['gzk-search-filter-trigger', { 'is-active': activeFilterCount > 0 }]"
        text
        :aria-expanded="isPopoverVisible"
        @click="handleFilterEnter"
        @mouseenter="handleFilterEnter"
        @mouseleave="handleFilterLeave"
      >
        <span>{{ $t(activeFilterCount > 0 ? 'search.filtered' : 'search.filter') }}</span>
        <un-i-mdi-filter-variant class="gzk-search-filter-trigger__icon" />
      </ElButton>
    </template>
    <div class="gzk-search-filter-panel" @mouseenter="handleFilterEnter" @mouseleave="handleFilterLeave">
      <section class="gzk-search-filter-group">
        <h3 class="gzk-search-filter-group__title">{{ $t('search.sortBasis') }}</h3>
        <div class="gzk-search-filter-options">
          <ElCheckTag
            v-for="option in sortOptions"
            :key="option.value"
            class="gzk-search-filter-option"
            :checked="filters.sort === option.value"
            @change="handleSortChange(option.value)"
          >
            {{ option.label }}
          </ElCheckTag>
        </div>
      </section>
      <div class="gzk-search-filter-pair">
        <section ref="nodeGroupRef" class="gzk-search-filter-group" :style="nodeGroupStyle">
          <h3 class="gzk-search-filter-group__title">{{ $t('search.belongingNode') }}</h3>
          <ElSelect
            v-model="filters.node"
            class="gzk-search-filter-control"
            :loading="nodesLoading"
            :teleported="false"
            @change="handleNodeChange"
            @visible-change="handleNodeDropdownVisible"
          >
            <ElOption :value="0" :label="$t('search.allNodes')" />
            <ElOption
              v-for="nodeOption in nodeOptions"
              :key="nodeOption.value"
              :value="nodeOption.value"
              :label="nodeOption.label"
            />
          </ElSelect>
        </section>
        <section class="gzk-search-filter-group">
          <h3 class="gzk-search-filter-group__title">{{ $t('search.author') }}</h3>
          <ElInput
            ref="authorInputRef"
            v-model="filters.author"
            class="gzk-search-filter-control"
            :placeholder="$t('search.username')"
            maxlength="80"
            clearable
            @change="commitAuthor"
            @clear="handleAuthorClear"
            @keydown.enter.stop.prevent="handleAuthorEnter"
          />
        </section>
      </div>
      <section class="gzk-search-filter-group">
        <h3 class="gzk-search-filter-group__title">{{ $t('search.publishTime') }}</h3>
        <div class="gzk-search-filter-options">
          <ElCheckTag
            v-for="option in timeOptions"
            :key="option.value"
            class="gzk-search-filter-option"
            :checked="timePreset === option.value"
            @change="handleTimePresetChange(option.value)"
          >
            {{ option.label }}
          </ElCheckTag>
        </div>
        <div class="gzk-search-filter-range">
          <div class="gzk-search-time-range" @click="handleDateRangeClick">
            <span class="gzk-search-time-range__field">
              <ElDatePicker
                v-model="filters.since"
                type="date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled-date="disabledStartDate"
                :placeholder="$t('search.startDate')"
                :teleported="false"
                @change="handleDateChange('since', $event)"
              />
            </span>
            <span class="gzk-search-time-range__separator">-</span>
            <span class="gzk-search-time-range__field">
              <ElDatePicker
                v-model="filters.until"
                type="date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled-date="disabledEndDate"
                :placeholder="$t('search.endDate')"
                :teleported="false"
                @change="handleDateChange('until', $event)"
              />
            </span>
          </div>
        </div>
      </section>
      <div class="gzk-search-filter-actions">
        <ElButton class="gzk-search-filter-action" text @click="handleReset">
          <un-i-mdi-restore class="gzk-search-filter-action__icon" />
          <span>{{ $t('search.reset') }}</span>
        </ElButton>
        <ElButton class="gzk-search-filter-action" text @click="closeFilterPanel(true)">
          <svg
            class="gzk-search-filter-action__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M10 7h4M7 12h10M4 17h16" />
          </svg>
          <span>{{ $t('search.collapse') }}</span>
        </ElButton>
      </div>
    </div>
  </ElPopover>
</template>

<style lang="scss" scoped>
.gzk-search-filter-trigger {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 8px;
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  border-radius: 6px;

  &:hover {
    color: var(--el-text-color-primary);
  }

  &.is-active,
  &.is-active:hover {
    color: var(--el-color-primary);
  }
}

.gzk-search-filter-trigger__icon {
  width: 16px;
  height: 16px;
  margin-left: 4px;
}

:global(.gzk-search-filter-popover.el-popover) {
  box-sizing: border-box;
  max-width: calc(100vw - 40px);
  padding: 16px 16px 0;
  border-color: var(--el-border-color-lighter);
  border-radius: 12px;
}

.gzk-search-filter-panel {
  color: var(--el-text-color-primary);
}

.gzk-search-filter-pair + .gzk-search-filter-group {
  margin-top: 14px;
}

.gzk-search-filter-group__title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.gzk-search-filter-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.gzk-search-filter-control {
  width: 100%;
}

.gzk-search-filter-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.gzk-search-filter-option {
  display: inline-grid;
  place-items: center;
  width: 100%;
  min-height: 34px;
  padding: 0 6px;
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-light);
  border-radius: 8px;

  &:hover {
    background: var(--el-fill-color);
  }

  &.is-checked {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.is-checked:hover {
    background: var(--el-color-primary-light-9);
  }
}

:global(.gzk-search-filter-popover .el-input__wrapper),
:global(.gzk-search-filter-popover .el-select__wrapper) {
  height: 34px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
}

:global(.gzk-search-filter-popover .el-input__inner),
:global(.gzk-search-filter-popover .el-select__selected-item) {
  font-size: 13px;
}

:global(.gzk-search-filter-popover .el-select-dropdown__wrap) {
  max-height: var(--gzk-node-dropdown-max-height, 274px);
}

.gzk-search-filter-range {
  margin-top: 12px;
}

.gzk-search-time-range {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  cursor: text;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--el-border-color-hover);
  }

  &:focus-within {
    border-color: var(--el-color-primary);
  }

  :deep(.el-date-editor.el-input) {
    flex: 1 1 0;
    width: auto;
    min-width: 0;
    height: 32px;
  }

  :deep(.el-input__wrapper) {
    position: relative;
    height: 32px;
    min-height: 32px;
    padding: 0;
    background: transparent;
    border-radius: 0;
    box-shadow: none !important;
  }

  :deep(.el-input__prefix) {
    display: none;
  }

  :deep(.el-input__suffix) {
    position: absolute;
    top: 50%;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    padding: 0;
    margin: 0;
    transform: translateY(-50%);
  }

  :deep(.el-input__suffix .el-input__icon) {
    width: 14px;
    height: 14px;
    margin: 0;
    font-size: 14px;
    line-height: 1;
  }

  :deep(.el-input__inner) {
    height: 32px;
    padding: 0 14px;
    font-size: 13px;
    line-height: 32px;
    text-align: center;
  }
}

.gzk-search-time-range__field {
  position: relative;
  display: flex;
  flex: 1 1 0;
  align-items: center;
  min-width: 0;
  height: 32px;

  &:first-child {
    :deep(.el-input__prefix) {
      display: inline-flex;
      color: var(--el-text-color-placeholder);
    }
  }
}

.gzk-search-time-range__separator {
  flex: none;
  margin: 0 5px;
  font-size: 14px;
  line-height: 1;
  color: var(--el-text-color-secondary);
  user-select: none;
}

.gzk-search-filter-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 8px 0 10px;
  margin-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.gzk-search-filter-action {
  width: 100%;
  min-height: 36px;
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  border-radius: 9px;

  &:hover {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color) !important;
  }
}

.gzk-search-filter-action__icon {
  flex: none;
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

@media (width <= 479px) {
  :global(.gzk-search-filter-popover.el-popover) {
    max-width: calc(100vw - 32px);
  }
}

@media (width <= 360px) {
  .gzk-search-filter-pair {
    grid-template-columns: 1fr;
  }
}
</style>
