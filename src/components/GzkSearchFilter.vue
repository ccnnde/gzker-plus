<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';

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
const DATE_PANEL_OFFSET = 12;

const controller = inject(SEARCH_FILTER_INJECTION_KEY);

if (!controller) {
  throw new Error('Search filters controller is not provided');
}

const { filters, timePreset, sortOptions, timeOptions, activeFilterCount } = controller;
const { applyTimePreset, updateDateRange, disabledStartDate, disabledEndDate } = controller;
const authorInputRef = ref<InputInstance>();
const panelRef = ref<HTMLElement>();
const dateRangeRef = ref<HTMLElement>();
const datePanelHeight = ref<number>();
const nodeGroupRef = ref<HTMLElement>();
const isPopoverVisible = ref(false);
const suppressHover = ref(false);
const nodeDropdownMaxHeight = ref<number>();
const isNodeDropdownOpen = ref(false);
let closeTimer: number | undefined;

const datePanelStyle = computed(() => {
  if (datePanelHeight.value === undefined) {
    return undefined;
  }

  return { '--gzkp-search-filter-date-height': `${datePanelHeight.value}px` };
});

const syncDatePanelHeight = () => {
  const panelEl = panelRef.value;
  const rangeEl = dateRangeRef.value;
  const inputEl = rangeEl?.querySelector<HTMLElement>('.el-date-editor');

  if (!panelEl || !rangeEl || !inputEl || !panelEl.offsetHeight) {
    return;
  }

  const panelRect = panelEl.getBoundingClientRect();
  const rangeRect = rangeEl.getBoundingClientRect();
  const inputRect = inputEl.getBoundingClientRect();
  const sideGap = rangeRect.left - panelRect.left;

  datePanelHeight.value = Math.max(inputRect.top - panelRect.top - sideGap - DATE_PANEL_OFFSET, 0);
};

useResizeObserver(panelRef, syncDatePanelHeight);

const getDateOffset = (field: SearchDateField): [number, number] => {
  const rangeEl = dateRangeRef.value;
  const fieldIndex = field === 'since' ? 0 : 1;
  const inputEl = rangeEl?.querySelectorAll<HTMLElement>('.el-date-editor')[fieldIndex];

  if (!rangeEl || !inputEl) {
    return [0, DATE_PANEL_OFFSET];
  }

  const rangeRect = rangeEl.getBoundingClientRect();
  const inputRect = inputEl.getBoundingClientRect();
  const horizontalOffset = field === 'since' ? rangeRect.left - inputRect.left : rangeRect.right - inputRect.right;

  return [horizontalOffset, DATE_PANEL_OFFSET];
};

const getDatePopperOptions = (field: SearchDateField) => ({
  modifiers: [
    { name: 'flip', enabled: false },
    {
      name: 'offset',
      options: {
        offset: () => {
          return getDateOffset(field);
        },
      },
    },
    {
      name: 'preventOverflow',
      options: {
        boundary: panelRef.value,
        padding: 8,
        tether: false,
        altAxis: true,
      },
    },
  ],
});

const nodeGroupStyle = computed(() => {
  if (nodeDropdownMaxHeight.value === undefined) {
    return undefined;
  }

  return { '--gzkp-node-dropdown-max-height': `${nodeDropdownMaxHeight.value}px` };
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
  const popoverEl = groupEl?.closest<HTMLElement>('.gzkp-search-filter-popover');

  if (!groupEl || !wrapEl || !popoverEl) {
    return;
  }

  const popoverRect = popoverEl.getBoundingClientRect();
  const wrapRect = wrapEl.getBoundingClientRect();
  const sideGap = wrapRect.left - popoverRect.left;

  nodeDropdownMaxHeight.value = Math.max(popoverRect.bottom - wrapRect.top - sideGap, 0);
};

const handleNodeDropdownVisible = async (visible: boolean) => {
  isNodeDropdownOpen.value = visible;

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

  if (event.target.closest('.gzkp-search-filter-trigger, .gzkp-search-filter-popover')) {
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

  if (isNodeDropdownOpen.value) {
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
    popper-class="gzkp-search-filter-popover"
    :show-arrow="false"
    persistent
  >
    <template #reference>
      <ElButton
        :class="['gzkp-search-filter-trigger', { 'is-active': activeFilterCount > 0 }]"
        text
        :aria-expanded="isPopoverVisible"
        @click="handleFilterEnter"
        @mouseenter="handleFilterEnter"
        @mouseleave="handleFilterLeave"
      >
        <span>{{ $t(activeFilterCount > 0 ? 'search.filtered' : 'search.filter') }}</span>
        <un-i-mdi-filter-variant class="gzkp-search-filter-trigger__icon" />
      </ElButton>
    </template>
    <div
      ref="panelRef"
      class="gzkp-search-filter-panel"
      :style="datePanelStyle"
      @mouseenter="handleFilterEnter"
      @mouseleave="handleFilterLeave"
    >
      <section class="gzkp-search-filter-group">
        <h3 class="gzkp-search-filter-group__title">{{ $t('search.sortBasis') }}</h3>
        <div class="gzkp-search-filter-options">
          <ElCheckTag
            v-for="option in sortOptions"
            :key="option.value"
            class="gzkp-search-filter-option"
            :checked="filters.sort === option.value"
            @change="handleSortChange(option.value)"
          >
            {{ option.label }}
          </ElCheckTag>
        </div>
      </section>
      <div class="gzkp-search-filter-pair">
        <section ref="nodeGroupRef" class="gzkp-search-filter-group" :style="nodeGroupStyle">
          <h3 class="gzkp-search-filter-group__title">{{ $t('search.belongingNode') }}</h3>
          <ElSelect
            v-model="filters.node"
            class="gzkp-search-filter-control"
            filterable
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
        <section class="gzkp-search-filter-group">
          <h3 class="gzkp-search-filter-group__title">{{ $t('search.author') }}</h3>
          <ElInput
            ref="authorInputRef"
            v-model="filters.author"
            class="gzkp-search-filter-control"
            :placeholder="$t('search.username')"
            maxlength="80"
            clearable
            @change="commitAuthor"
            @clear="handleAuthorClear"
            @keydown.enter.stop.prevent="handleAuthorEnter"
          />
        </section>
      </div>
      <section class="gzkp-search-filter-group">
        <h3 class="gzkp-search-filter-group__title">{{ $t('search.publishTime') }}</h3>
        <div class="gzkp-search-filter-options">
          <ElCheckTag
            v-for="option in timeOptions"
            :key="option.value"
            class="gzkp-search-filter-option"
            :checked="timePreset === option.value"
            @change="handleTimePresetChange(option.value)"
          >
            {{ option.label }}
          </ElCheckTag>
        </div>
        <div class="gzkp-search-filter-range">
          <div ref="dateRangeRef" class="gzkp-search-time-range" @click="handleDateRangeClick">
            <span class="gzkp-search-time-range__field">
              <ElDatePicker
                v-model="filters.since"
                type="date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                placement="top-start"
                popper-class="gzkp-search-filter-date-popper"
                :popper-options="getDatePopperOptions('since')"
                :disabled-date="disabledStartDate"
                :placeholder="$t('search.startDate')"
                :teleported="false"
                @change="handleDateChange('since', $event)"
                @visible-change="syncDatePanelHeight"
              />
            </span>
            <span class="gzkp-search-time-range__separator">-</span>
            <span class="gzkp-search-time-range__field">
              <ElDatePicker
                v-model="filters.until"
                type="date"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                placement="top-end"
                popper-class="gzkp-search-filter-date-popper"
                :popper-options="getDatePopperOptions('until')"
                :disabled-date="disabledEndDate"
                :placeholder="$t('search.endDate')"
                :teleported="false"
                @change="handleDateChange('until', $event)"
                @visible-change="syncDatePanelHeight"
              />
            </span>
          </div>
        </div>
      </section>
      <div class="gzkp-search-filter-actions">
        <ElButton class="gzkp-search-filter-action" text @click="handleReset">
          <un-i-mdi-restore class="gzkp-search-filter-action__icon" />
          <span>{{ $t('search.reset') }}</span>
        </ElButton>
        <ElButton class="gzkp-search-filter-action" text @click="closeFilterPanel(true)">
          <svg
            class="gzkp-search-filter-action__icon"
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
.gzkp-search-filter-trigger {
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

.gzkp-search-filter-trigger__icon {
  width: 16px;
  height: 16px;
  margin-left: 4px;
}

:global(.gzkp-search-filter-popover.el-popover.el-popper) {
  --gzkp-search-filter-hover-bg-color: var(--el-fill-color-dark);
  --gzkp-search-filter-selected-color: var(--el-color-primary);
  --gzkp-search-filter-selected-border-color: transparent;

  box-sizing: border-box;
  max-width: calc(100vw - 40px);
  padding: 0;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
}

:global(html[data-gzkp-theme='dark-soft'] .gzkp-search-filter-popover.el-popover) {
  --gzkp-search-filter-hover-bg-color: var(--el-fill-color-darker);
  --gzkp-search-filter-selected-border-color: var(--el-color-primary-light-5);
}

:global(html[data-gzkp-theme='light-solarized'] .gzkp-search-filter-popover.el-popover) {
  --gzkp-search-filter-selected-color: var(--el-color-primary-dark-2);
}

.gzkp-search-filter-panel {
  padding: 16px 16px 0;
  color: var(--el-text-color-primary);
}

.gzkp-search-filter-pair + .gzkp-search-filter-group {
  margin-top: 14px;
}

.gzkp-search-filter-group__title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.gzkp-search-filter-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.gzkp-search-filter-control {
  width: 100%;
}

.gzkp-search-filter-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.gzkp-search-filter-option {
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
    background: var(--gzkp-search-filter-hover-bg-color);
  }

  &.is-checked {
    color: var(--gzkp-search-filter-selected-color);
    background: var(--el-color-primary-light-9);
    box-shadow: inset 0 0 0 1px var(--gzkp-search-filter-selected-border-color);
  }

  &.is-checked:hover {
    background: var(--el-color-primary-light-9);
  }
}

:global(.gzkp-search-filter-popover .el-input__wrapper),
:global(.gzkp-search-filter-popover .el-select__wrapper) {
  height: 34px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
}

:global(.gzkp-search-filter-popover .el-input__inner),
:global(.gzkp-search-filter-popover .el-select__selected-item) {
  font-size: 13px;
}

:global(.gzkp-search-filter-popover .el-select-dropdown__wrap) {
  max-height: var(--gzkp-node-dropdown-max-height, 274px);
}

.gzkp-search-filter-range {
  margin-top: 12px;
}

.gzkp-search-filter-panel :deep(.el-select__popper),
.gzkp-search-filter-panel :deep(.gzkp-search-filter-date-popper) {
  border: 1px solid var(--el-border-color);

  .el-popper__arrow::before {
    border-color: var(--el-border-color);
  }
}

.gzkp-search-filter-panel :deep(.gzkp-search-filter-date-popper) {
  box-sizing: border-box;
  width: min(280px, calc(100vw - 88px));
  height: var(--gzkp-search-filter-date-height, 248px);

  .el-date-picker {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }

  .el-picker-panel__body-wrapper,
  .el-picker-panel__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .el-picker-panel__content {
    flex: 1;
    width: auto;
    min-height: 0;
    margin: 8px;
  }

  .el-date-table,
  .el-month-table,
  .el-year-table {
    height: 100%;
  }

  .el-date-table th {
    height: 28px;
    padding: 0;
    text-align: center;
  }

  .el-date-picker__header {
    padding: 8px 8px 0;
  }

  .el-date-picker__header-label {
    font-size: 14px;
  }

  .el-date-picker__header--bordered {
    padding-bottom: 8px;
  }

  .el-date-table td {
    height: auto;
    padding: 0;
    vertical-align: middle;
  }

  .el-date-table .el-date-table-cell {
    height: 28px;
    padding: 2px 0;
  }

  .el-month-table td,
  .el-year-table td {
    padding: 4px 0;
  }
}

.gzkp-search-time-range {
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

.gzkp-search-time-range__field {
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

.gzkp-search-time-range__separator {
  flex: none;
  margin: 0 5px;
  font-size: 14px;
  line-height: 1;
  color: var(--el-text-color-secondary);
  user-select: none;
}

.gzkp-search-filter-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 8px 0 10px;
  margin-top: 14px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.gzkp-search-filter-action {
  width: 100%;
  min-height: 36px;
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  border-radius: 9px;

  &:hover {
    color: var(--el-text-color-primary);
    background: var(--gzkp-search-filter-hover-bg-color) !important;
  }
}

.gzkp-search-filter-action__icon {
  flex: none;
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

@media (width <= 479px) {
  :global(.gzkp-search-filter-popover.el-popover.el-popper) {
    max-width: calc(100vw - 32px);
  }
}

@media (width <= 360px) {
  .gzkp-search-filter-pair {
    grid-template-columns: 1fr;
  }
}
</style>
