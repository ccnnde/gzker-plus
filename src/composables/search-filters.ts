import { computed, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { t } from '@/i18n';
import { SearchScope, SearchSort, SearchTimePreset } from '@/constants';

import type {
  SearchDateField,
  SearchFilters,
  SearchFiltersController,
  SearchParams,
  SearchSortOption,
  SearchTimeOption,
} from '@/types';

export const useSearchFilters = (): SearchFiltersController => {
  const filters = reactive<SearchFilters>({
    scope: SearchScope.All,
    sort: SearchSort.Relevance,
    node: 0,
    author: '',
    since: '',
    until: '',
  });
  const timePreset = ref(SearchTimePreset.All);
  let lastValidSince = '';
  let lastValidUntil = '';

  const sortOptions = computed<SearchSortOption[]>(() => {
    return [
      { label: t('search.relevance'), value: SearchSort.Relevance },
      { label: t('search.newest'), value: SearchSort.Newest },
    ];
  });

  const timeOptions = computed<SearchTimeOption[]>(() => {
    return [
      { label: t('search.timeAll'), value: SearchTimePreset.All },
      { label: t('search.timeDay'), value: SearchTimePreset.Day },
      { label: t('search.timeWeek'), value: SearchTimePreset.Week },
      { label: t('search.timeMonth'), value: SearchTimePreset.Month },
      { label: t('search.timeHalfYear'), value: SearchTimePreset.HalfYear },
      { label: t('search.timeCustom'), value: SearchTimePreset.Custom },
    ];
  });

  const hasActiveTimeFilter = computed(() => {
    return (
      timePreset.value !== SearchTimePreset.All &&
      (timePreset.value !== SearchTimePreset.Custom || Boolean(filters.since || filters.until))
    );
  });

  const activeFilterCount = computed(() => {
    return (
      Number(filters.sort !== SearchSort.Relevance) +
      Number(filters.node !== 0) +
      Number(Boolean(filters.author.trim())) +
      Number(hasActiveTimeFilter.value)
    );
  });

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPastDate = (dayNumber: number): string => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - dayNumber);
    return formatLocalDate(date);
  };

  const setDateFilters = (since: string, until: string) => {
    filters.since = since;
    filters.until = until;
    lastValidSince = since;
    lastValidUntil = until;
  };

  const validateDateRange = (): boolean => {
    if (!filters.since || !filters.until || filters.since <= filters.until) {
      return true;
    }

    ElMessage({
      message: t('search.invalidDateRange'),
      type: 'warning',
    });
    return false;
  };

  const getFilterKey = (): string => {
    return JSON.stringify({
      scope: filters.scope,
      sort: filters.sort,
      node: filters.node,
      author: filters.author.trim(),
      since: filters.since || '',
      until: filters.until || '',
    });
  };

  const getSearchParams = (keyword: string, page?: number): SearchParams => {
    return {
      q: keyword,
      scope: filters.scope,
      sort: filters.sort,
      node: filters.node,
      author: filters.author.trim(),
      since: filters.since || '',
      until: filters.until || '',
      p: page,
    };
  };

  const resetFilterValues = () => {
    filters.sort = SearchSort.Relevance;
    filters.node = 0;
    filters.author = '';
    filters.since = '';
    filters.until = '';
    timePreset.value = SearchTimePreset.All;
    lastValidSince = '';
    lastValidUntil = '';
  };

  const applyTimePreset = (preset: SearchTimePreset) => {
    timePreset.value = preset;

    switch (preset) {
      case SearchTimePreset.Day:
        setDateFilters(getPastDate(0), getPastDate(0));
        break;
      case SearchTimePreset.Week:
        setDateFilters(getPastDate(6), getPastDate(0));
        break;
      case SearchTimePreset.Month:
        setDateFilters(getPastDate(29), getPastDate(0));
        break;
      case SearchTimePreset.HalfYear:
        setDateFilters(getPastDate(179), getPastDate(0));
        break;
      default:
        setDateFilters('', '');
        break;
    }
  };

  const updateDateRange = (field: SearchDateField, value: unknown): boolean => {
    filters[field] = typeof value === 'string' ? value : '';

    if (!validateDateRange()) {
      filters.since = lastValidSince;
      filters.until = lastValidUntil;
      return false;
    }

    lastValidSince = filters.since;
    lastValidUntil = filters.until;
    timePreset.value = filters.since || filters.until ? SearchTimePreset.Custom : SearchTimePreset.All;
    return true;
  };

  const disabledStartDate = (date: Date): boolean => {
    return Boolean(filters.until && formatLocalDate(date) > filters.until);
  };

  const disabledEndDate = (date: Date): boolean => {
    return Boolean(filters.since && formatLocalDate(date) < filters.since);
  };

  return {
    filters,
    timePreset,
    sortOptions,
    timeOptions,
    activeFilterCount,
    getFilterKey,
    getSearchParams,
    validateDateRange,
    resetFilterValues,
    applyTimePreset,
    updateDateRange,
    disabledStartDate,
    disabledEndDate,
  };
};
