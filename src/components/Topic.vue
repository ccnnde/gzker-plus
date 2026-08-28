<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onMounted, provide, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import { debounce } from 'lodash-es';

import FadeTransition from '@/transitions/FadeTransition.vue';
import { useClickModal } from '@/composables/click-modal';
import { useDialog } from '@/composables/dialog';
import { useReplyBatchLoad } from '@/composables/reply-batch-load';
import { useRequest } from '@/composables/request';
import { useScrollLoad } from '@/composables/scroll-load';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { favoriteTopic, getEditedTopic, getUserTopic, likeTopic, parseUserTopic, unfavoriteTopic } from '@/api';
import {
  addUnit,
  blockTopics,
  blurActiveElement,
  calcTopicPageDialogVH,
  getStorage,
  hideGlobalLoading,
  isGlobalLoadingVisible,
  request,
  setStorage,
  waitTime,
} from '@/utils';
import { emitter } from '@/utils/event-bus';
import { isImgViewerVisible, viewerOptions, vViewer } from '@/utils/img-viewer';
import {
  DialogType,
  LinkElementType,
  NestedReplyDisplay,
  OptionsKey,
  REPLY_PRELOAD_PAGE_COUNT,
  ReplyOrder,
  ReplyPreloadMode,
  topicLinkRegExp,
} from '@/constants';
import {
  ADD_REPLY_INJECTION_KEY,
  EDIT_REPLY_INJECTION_KEY,
  UPDATE_SCROLLBAR_INJECTION_KEY,
} from '@/constants/inject-key';
import { SUCCESS_CANCEL_FAVORITE_TOPIC, SUCCESS_FAVORITE_TOPIC, SUCCESS_LIKE } from '@/constants/res-msg';
import { SELECTOR_TOPIC_LINK, SELECTOR_TOPIC_REPLY_TOTAL } from '@/constants/selector';

import ElementConfig from './ElementConfig.vue';
import LoadError from './LoadError.vue';
import ReplyEditor from './ReplyEditor.vue';
import TopicDetail from './TopicDetail.vue';
import TopicEditor from './TopicEditor.vue';
import TopicFooter from './TopicFooter.vue';
import TopicReply from './TopicReply.vue';
import TopicUserInfoPopover from './TopicUserInfoPopover.vue';

import type { CSSProperties } from 'vue';
import type { DialogBeforeCloseFn } from 'element-plus';
import type { PageDataSeed, UserReplyBatch, UserReplyItem, UserTopic, UserTopicDetail, UserTopicStatus } from '@/types';

import 'viewerjs/dist/viewer.css';

const PAGE_SIZE = 106;
const createTopicLinkRegExp = /\/t\/create\/(\w+)/;

const storage = useStorageStore();
const { options } = storeToRefs(storage);
const { closeOnClickModal } = useClickModal(DialogType.TopicViewer);
const { dialogVisible, openDialog, closeDialog } = useDialog();
const { isLoading, handleRequest, resetRequestState } = useRequest();
const isTopicPreloadLoading = ref<boolean>(false);
const topicPreloadError = ref<boolean>(false);
const topicId = ref<string>();
const topicDetail = ref<UserTopicDetail>();
const topicStatus = ref<UserTopicStatus>();
const replyTotal = ref<string>('0');
const isTopicPage = ref<boolean>(false);
const topicContainer = ref<HTMLDivElement | null>(null);
const replyOrder = ref<ReplyOrder>(ReplyOrder.Asc);

let topicPreloadVersion = 0;
let topicPreloadAbortController: AbortController | undefined;
let replyOrderToggleVersion = 0;

const resetTopicPreloadRequestState = () => {
  topicPreloadVersion++;
  topicPreloadAbortController?.abort();
  topicPreloadAbortController = undefined;
  isTopicPreloadLoading.value = false;
  topicPreloadError.value = false;
};

const isReverseReply = computed<boolean>(() => {
  return replyOrder.value === ReplyOrder.Desc;
});

const initReplyOrder = () => {
  replyOrder.value = options.value?.[OptionsKey.ReverseReplyOrder]?.checked ? ReplyOrder.Desc : ReplyOrder.Asc;
};

const getParsedTopicPage = (search: string, total: string, list: UserReplyItem[]) => {
  const requestedPage = Number(new URLSearchParams(search).get('p'));

  if (requestedPage > 0) {
    return requestedPage;
  }

  const firstReplyNo = Number(list[0]?.replyNo);

  if (firstReplyNo > 0) {
    return Math.ceil(firstReplyNo / PAGE_SIZE);
  }

  return total === '0' ? 1 : Math.max(Math.ceil(Number(total) / PAGE_SIZE), 1);
};

const createTopicPageSeed = (page: number, data: UserTopic): PageDataSeed<UserTopic> | undefined => {
  const total = Number(data.reply.total);
  const totalPageNumber = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  if (page < 1 || page > totalPageNumber || (total > 0 && data.reply.list.length === 0)) {
    return undefined;
  }

  return {
    page,
    data,
  };
};

const showReply = computed(() => {
  return replyTotal.value !== '0';
});

const nestedReplyDisplay = computed<NestedReplyDisplay>(() => {
  return options.value?.[OptionsKey.NestedReplyDisplay]?.display || NestedReplyDisplay.Indent;
});

const multipleInsideOne = computed<boolean>(() => {
  return options.value?.[OptionsKey.NestedReplyMultipleInsideOne]?.checked ?? true;
});

const replyPreloadMode = computed<ReplyPreloadMode>(() => {
  return options.value?.[OptionsKey.ReplyPreload]?.mode || ReplyPreloadMode.TwoPages;
});

const replyBatchPageCount = computed<number>(() => {
  return REPLY_PRELOAD_PAGE_COUNT[replyPreloadMode.value] || REPLY_PRELOAD_PAGE_COUNT[ReplyPreloadMode.TwoPages];
});

const isNestedReplyEnabled = computed<boolean>(() => {
  return nestedReplyDisplay.value !== NestedReplyDisplay.Off;
});

const isTopicLinkBlank = computed(() => {
  if (!options.value) {
    return false;
  }

  const { checkedLinkTypes } = options.value[OptionsKey.BlankLink];
  return checkedLinkTypes.includes(LinkElementType.Topic);
});

const getTopicCallback = async (page: number, signal: AbortSignal): Promise<UserReplyItem[]> => {
  const currentTopicId = topicId.value;

  if (!currentTopicId) {
    return [];
  }

  const {
    detail,
    status,
    reply: { total, list },
  } = await getUserTopic(currentTopicId, page, signal);

  if (signal.aborted || topicId.value !== currentTopicId) {
    return [];
  }

  topicDetail.value = detail;
  topicStatus.value = status;
  replyTotal.value = total;

  return list;
};

const {
  dataList: replyList,
  scrollbar,
  isFirstPage,
  isFirstPageLoading,
  isNextPageLoading,
  disableInfiniteScroll,
  errorOccurred,
  getFirstPageData,
  getNextPageData,
  startForwardLoad,
  startReverseLoad,
  reloadPageData,
  reloadFirstPageData,
  updateCurrentPageData,
  replaceLoadedData,
  resetScrollLoadState,
  scrollToTop,
  scrollToBottom,
  scrollBy,
  scrollToElement,
} = useScrollLoad<UserReplyItem>(PAGE_SIZE, getTopicCallback);

const handleBatchPageLoaded = (data: UserTopic, page: number) => {
  const {
    detail,
    status,
    reply: { total },
  } = data;

  replyTotal.value = total;

  if (page === 1) {
    topicDetail.value = detail;
    topicStatus.value = status;
  }
};

const {
  batches: replyBatches,
  dataList: nestedReplyList,
  lastLoadedPage: lastNestedReplyPage,
  isLoading: isBatchLoading,
  isFirstBatchLoading,
  isNextBatchLoading,
  disableBatchLoad,
  errorOccurred: batchLoadError,
  startBatchLoad,
  getNextBatchData,
  reloadBatchData,
  setBatchPageCount,
  updateLastPageData,
  resetBatchLoadState,
} = useReplyBatchLoad({
  pageSize: PAGE_SIZE,
  requestCallback: async (id, page, signal) => {
    return getUserTopic(id, page, signal);
  },
  pageLoadedCallback: handleBatchPageLoaded,
  errorCallback: (err) => {
    ElMessage.error(err.message);
  },
});

const effectiveReplyList = computed<UserReplyItem[]>(() => {
  return isNestedReplyEnabled.value ? nestedReplyList.value : replyList.value;
});

const isReplyFirstPageLoading = computed<boolean>(() => {
  return isNestedReplyEnabled.value ? isFirstBatchLoading.value : isFirstPageLoading.value;
});

const isReplyNextPageLoading = computed<boolean>(() => {
  return isNestedReplyEnabled.value ? isNextBatchLoading.value : isNextPageLoading.value;
});

const replyLoadError = computed<boolean>(() => {
  return topicPreloadError.value || (isNestedReplyEnabled.value ? batchLoadError.value : errorOccurred.value);
});

const disableReplyInfiniteScroll = computed<boolean>(() => {
  return isNestedReplyEnabled.value ? disableBatchLoad.value : disableInfiniteScroll.value;
});

const isReplyFirstPage = computed<boolean>(() => {
  return isNestedReplyEnabled.value ? replyBatches.value.length === 0 : isFirstPage.value;
});

watch(isBatchLoading, async (loading) => {
  if (!loading || replyBatches.value.length === 0) {
    return;
  }

  await nextTick();
  scrollToBottom();
});

const getNextReplyData = () => {
  if (isNestedReplyEnabled.value) {
    getNextBatchData();
    return;
  }

  getNextPageData();
};

const reloadReplyData = () => {
  if (topicPreloadError.value) {
    resetTopicPreloadRequestState();
    loadTopicReplies();
    return;
  }

  if (isNestedReplyEnabled.value) {
    reloadBatchData();
    return;
  }

  reloadPageData();
};

/**
 * 倒序首屏预请求：获取最新回复总数并缓存第一页数据
 */
const preloadFirstPageTopic = async (): Promise<UserTopic | undefined> => {
  const currentTopicId = topicId.value;

  if (!currentTopicId) {
    return undefined;
  }

  const preloadVersion = ++topicPreloadVersion;
  topicPreloadAbortController?.abort();

  const abortController = new AbortController();
  topicPreloadAbortController = abortController;
  isTopicPreloadLoading.value = true;
  topicPreloadError.value = false;

  try {
    const firstPageData = await getUserTopic(currentTopicId, 1, abortController.signal);

    if (preloadVersion !== topicPreloadVersion || abortController.signal.aborted || topicId.value !== currentTopicId) {
      return undefined;
    }

    topicDetail.value = firstPageData.detail;
    topicStatus.value = firstPageData.status;
    replyTotal.value = firstPageData.reply.total;
    return firstPageData;
  } catch (err) {
    if (preloadVersion !== topicPreloadVersion || abortController.signal.aborted) {
      return undefined;
    }

    topicPreloadError.value = true;
    ElMessage.error((err as Error).message);
    console.error(err);
    return undefined;
  } finally {
    if (preloadVersion === topicPreloadVersion) {
      topicPreloadAbortController = undefined;
      isTopicPreloadLoading.value = false;
    }
  }
};

/**
 * 当前主题加载是否已失效（用户已切换主题或关闭对话框）
 */
const isTopicLoadStale = (loadedTopicId: string): boolean => {
  return topicId.value !== loadedTopicId || !dialogVisible.value;
};

/**
 * 回复加载统一入口：按当前顺序与楼中楼设置分发到对应的加载链路
 */
const loadTopicReplies = async (loadOptions?: { pageSeeds?: PageDataSeed<UserTopic>[] }) => {
  const loadedTopicId = topicId.value;
  const loadedReplyOrder = replyOrder.value;
  const loadedNestedReplyEnabled = isNestedReplyEnabled.value;

  if (!loadedTopicId) {
    return;
  }

  let pageSeeds = [...(loadOptions?.pageSeeds || [])];

  if (loadedReplyOrder === ReplyOrder.Desc && pageSeeds.length === 0) {
    const firstPageData = await preloadFirstPageTopic();

    if (firstPageData) {
      pageSeeds = [
        {
          page: 1,
          data: firstPageData,
        },
      ];
    }
  }

  if (
    isTopicLoadStale(loadedTopicId) ||
    replyOrder.value !== loadedReplyOrder ||
    isNestedReplyEnabled.value !== loadedNestedReplyEnabled
  ) {
    return;
  }

  if (loadedReplyOrder === ReplyOrder.Desc) {
    const initialPageSeed = pageSeeds[0];

    if (!initialPageSeed) {
      return;
    }

    const initialTotal = Number(initialPageSeed.data.reply.total);
    const initialLastPage = Math.ceil(initialTotal / PAGE_SIZE);
    const loadReverseData = async (
      lastPage: number,
      total: number,
      cachedPageSeeds: PageDataSeed<UserTopic>[],
    ): Promise<void> => {
      if (loadedNestedReplyEnabled) {
        await startBatchLoad(loadedTopicId, replyBatchPageCount.value, {
          pageSeeds: cachedPageSeeds,
          reverse: true,
          knownTotal: total,
        });
        return;
      }

      const replyPageSeeds: PageDataSeed<UserReplyItem[]>[] = cachedPageSeeds.map(({ page, data }) => {
        return {
          page,
          data: data.reply.list,
        };
      });
      await startReverseLoad(lastPage, replyPageSeeds);
    };

    await loadReverseData(initialLastPage, initialTotal, pageSeeds);

    if (
      isTopicLoadStale(loadedTopicId) ||
      replyOrder.value !== loadedReplyOrder ||
      isNestedReplyEnabled.value !== loadedNestedReplyEnabled
    ) {
      return;
    }

    const correctedLastPage = Math.ceil(Number(replyTotal.value) / PAGE_SIZE);

    if (correctedLastPage !== initialLastPage) {
      const correctedPageSeeds: PageDataSeed<UserTopic>[] = pageSeeds
        .filter(({ page }) => page <= Math.max(correctedLastPage, 1))
        .map(({ page, data }) => {
          return {
            page,
            data: {
              ...data,
              reply: {
                ...data.reply,
                total: replyTotal.value,
              },
            },
          };
        });
      await loadReverseData(correctedLastPage, Number(replyTotal.value), correctedPageSeeds);
    }

    return;
  }

  const totalPageNumber = pageSeeds[0] ? Math.ceil(Number(pageSeeds[0].data.reply.total) / PAGE_SIZE) : undefined;

  if (loadedNestedReplyEnabled) {
    await startBatchLoad(loadedTopicId, replyBatchPageCount.value, {
      pageSeeds,
    });
    return;
  }

  const replyPageSeeds: PageDataSeed<UserReplyItem[]>[] = pageSeeds.map(({ page, data }) => {
    return {
      page,
      data: data.reply.list,
    };
  });
  await startForwardLoad(replyPageSeeds, totalPageNumber);
};

const scrollToReplyTotal = async (): Promise<void> => {
  await nextTick();

  const replyTotalElement = topicContainer.value?.querySelector<HTMLElement>(SELECTOR_TOPIC_REPLY_TOTAL);

  if (replyTotalElement) {
    scrollToElement(replyTotalElement);
  }
};

const handleToggleReplyOrder = async (): Promise<void> => {
  const toggleVersion = ++replyOrderToggleVersion;
  const nextReplyOrder = isReverseReply.value ? ReplyOrder.Asc : ReplyOrder.Desc;

  resetTopicPreloadRequestState();
  replyOrder.value = nextReplyOrder;

  resetScrollLoadState();
  resetBatchLoadState();
  await loadTopicReplies();

  if (toggleVersion !== replyOrderToggleVersion || replyOrder.value !== nextReplyOrder) {
    return;
  }

  await scrollToReplyTotal();
};

/**
 * 倒序楼中楼：发回复后更新顶部 batch（正序最后一页所在批次）
 */
const updateReverseTopBatch = (oldTotal: number, newTotal: number, lastPageList: UserReplyItem[]) => {
  const newLastPage = Math.ceil(newTotal / PAGE_SIZE);
  const oldLastPage = Math.ceil(oldTotal / PAGE_SIZE);

  if (newLastPage < oldLastPage) {
    return;
  }

  if (newLastPage > oldLastPage) {
    const newBatch: UserReplyBatch = {
      startPage: newLastPage,
      endPage: newLastPage,
      list: lastPageList,
    };

    replyBatches.value = [newBatch, ...replyBatches.value];
    return;
  }

  const topBatch = replyBatches.value[0];

  if (!topBatch || topBatch.endPage !== oldLastPage) {
    return;
  }

  const oldTopPageLength = oldTotal - (oldLastPage - 1) * PAGE_SIZE;
  const reservedList = topBatch.list.slice(0, Math.max(topBatch.list.length - oldTopPageLength, 0));
  const updatedTopBatch: UserReplyBatch = {
    ...topBatch,
    list: reservedList.concat(lastPageList),
  };

  replyBatches.value = [updatedTopBatch, ...replyBatches.value.slice(1)];
};

/**
 * 倒序扁平：发回复后更新顶部页（正序最后一页）
 */
const updateReverseTopPage = (oldTotal: number, newTotal: number, lastPageList: UserReplyItem[]) => {
  const newLastPage = Math.ceil(newTotal / PAGE_SIZE);
  const oldLastPage = Math.ceil(oldTotal / PAGE_SIZE);

  if (newLastPage < oldLastPage) {
    return;
  }

  const reversedList = [...lastPageList].reverse();

  if (newLastPage > oldLastPage) {
    replyList.value = reversedList.concat(replyList.value);
    return;
  }

  const oldTopPageLength = oldTotal - (oldLastPage - 1) * PAGE_SIZE;
  replyList.value = reversedList.concat(replyList.value.slice(oldTopPageLength));
};

const getFirstPageTopicData = (list: UserReplyItem[]): UserTopic | undefined => {
  if (!topicDetail.value || !topicStatus.value) {
    return undefined;
  }

  return {
    detail: topicDetail.value,
    status: topicStatus.value,
    reply: {
      total: replyTotal.value,
      list: list.slice(0, PAGE_SIZE),
    },
  };
};

watch(replyBatchPageCount, (pageCount) => {
  setBatchPageCount(pageCount);
});

watch(isNestedReplyEnabled, (nestedReplyEnabled, previousNestedReplyEnabled) => {
  if (nestedReplyEnabled === previousNestedReplyEnabled || !topicId.value || !dialogVisible.value) {
    return;
  }

  if (isReverseReply.value) {
    // 倒序下两种模式的数据形状不兼容（扁平为纯倒序、楼中楼为页组），直接重载首屏
    resetScrollLoadState();
    resetBatchLoadState();
    loadTopicReplies();
    return;
  }

  if (nestedReplyEnabled) {
    const firstPageData = getFirstPageTopicData(replyList.value);
    resetScrollLoadState();
    startBatchLoad(topicId.value, replyBatchPageCount.value, {
      pageSeeds: firstPageData
        ? [
            {
              page: 1,
              data: firstPageData,
            },
          ]
        : [],
    });
    return;
  }

  const loadedReplyList = nestedReplyList.value;
  const loadedPage = lastNestedReplyPage.value;
  const isComplete = loadedReplyList.length >= Number(replyTotal.value);
  resetBatchLoadState();

  if (loadedReplyList.length) {
    replaceLoadedData(loadedPage, loadedReplyList, isComplete);
  } else if (Number(replyTotal.value) > 0) {
    getFirstPageData();
  }
});

onBeforeMount(() => {
  insertTopicButton();

  const { pathname, search } = window.location;

  if (!topicLinkRegExp.test(pathname)) {
    return;
  }

  topicId.value = pathname.match(topicLinkRegExp)?.[1];
  isTopicPage.value = true;
  initReplyOrder();

  let parsedTopic: UserTopic;

  try {
    parsedTopic = parseUserTopic(document.body.innerHTML);
  } catch (err) {
    console.error(err);
    hideGlobalLoading();
    ElMessage.error(t('enhancedTopic.parseTopicFailed'));
    return;
  }

  const {
    detail,
    status,
    reply: { total, list },
  } = parsedTopic;
  const parsedTopicPage = getParsedTopicPage(search, total, list);

  topicDetail.value = detail;
  topicStatus.value = status;
  replyTotal.value = total;

  openDialog();

  /**
   * 新标签页查看主题时，将当前 DOM 对应页作为隐藏缓存：
   * 加载器仍从正序首页或倒序末页开始展示，仅请求尚未缓存的页面。
   */
  const parsedTopicPageSeed = createTopicPageSeed(parsedTopicPage, parsedTopic);
  loadTopicReplies({
    pageSeeds: parsedTopicPageSeed ? [parsedTopicPageSeed] : [],
  });

  hideGlobalLoading();
});

onMounted(() => {
  const topicLinkElements = document.querySelectorAll<HTMLAnchorElement>(SELECTOR_TOPIC_LINK);

  topicLinkElements.forEach((element) => {
    const { href } = element;

    if (topicLinkRegExp.test(href)) {
      element.addEventListener('click', handleTopicClick);
    } else if (createTopicLinkRegExp.test(href)) {
      element.addEventListener('click', handleCreateTopicClick);
    }
  });

  emitter.on('clickTopic', handleTopicClick);
});

const CREATE_BTN_CLASS = 'gzk-create-btn';
const CREATE_BTN_LOAD_CLASS = CREATE_BTN_CLASS + '-loading';

const insertTopicButton = () => {
  const publishBtn = document.querySelector<HTMLButtonElement>('button.dropdown-toggle');
  const parentEle = publishBtn?.parentElement;

  if (publishBtn?.innerText.includes('发布新主题') && parentEle) {
    const button = document.createElement('a');
    const editIcon = document.createElement('div');
    const loadingIcon = document.createElement('div');

    button.href = '/t/create/water';
    button.className = `btn btn-primary ${CREATE_BTN_CLASS}`;
    editIcon.className = 'i-mdi-lead-pencil';
    loadingIcon.className = 'i-mdi-loading';

    parentEle.prepend(button);
    button.prepend(editIcon);
    button.prepend(loadingIcon);
    button.addEventListener('click', handleCreateTopicClick);
  }

  const nodePublishBtn = document.querySelector<HTMLAnchorElement>('.node-topics > .ui-header a[href^="/t/create"]');

  if (nodePublishBtn?.innerText.includes('创建新主题')) {
    const loadingIcon = document.createElement('div');
    loadingIcon.className = 'i-mdi-loading';
    nodePublishBtn.classList.add(CREATE_BTN_CLASS);
    nodePublishBtn.innerHTML = '<span>创建新主题</span>';
    nodePublishBtn.prepend(loadingIcon);
  }
};

const handleTopicClick = (e: Event) => {
  e.preventDefault();

  const { href } = e.target as HTMLAnchorElement;

  if (isTopicPage.value || isTopicLinkBlank.value) {
    window.open(href);
    return;
  }

  topicId.value = href.match(topicLinkRegExp)?.[1];
  initReplyOrder();
  openDialog();

  loadTopicReplies();
};

const handleCreateTopicClick = async (e: Event) => {
  e.preventDefault();

  const createBtn = document.querySelector<HTMLAnchorElement>(`.${CREATE_BTN_CLASS}`);
  createBtn?.classList.add(CREATE_BTN_LOAD_CLASS);

  try {
    const createTopicLinkEle = e.currentTarget as HTMLAnchorElement;
    const href = createTopicLinkEle.getAttribute('href') as string;
    await waitTime(300);

    if (import.meta.env.PROD) {
      await request(href);
    }

    const node = href.match(createTopicLinkRegExp)?.[1];
    addTopic(node as string);
  } catch (err) {
    ElMessage.error((err as Error).message);
    console.error(err);
  } finally {
    createBtn?.classList.remove(CREATE_BTN_LOAD_CLASS);
    (document.activeElement as HTMLElement)?.blur();
  }
};

const handleTopicFavorite = () => {
  handleRequest(async () => {
    if (!topicDetail.value) {
      return;
    }

    const { favorited, favoriteNumber } = topicDetail.value;

    if (favorited) {
      const data = await unfavoriteTopic(topicId.value);

      if (data === SUCCESS_CANCEL_FAVORITE_TOPIC) {
        topicDetail.value.favorited = false;
        topicDetail.value.favoriteNumber = String(Number(favoriteNumber) - 1);
      }
    } else {
      const data = await favoriteTopic(topicId.value);

      if (data === SUCCESS_FAVORITE_TOPIC) {
        topicDetail.value.favorited = true;
        topicDetail.value.favoriteNumber = String(Number(favoriteNumber) + 1);
      }
    }
  });
};

const handleTopicLike = () => {
  handleRequest(async () => {
    if (!topicDetail.value) {
      return;
    }

    const { likeNumber } = topicDetail.value;
    const data = await likeTopic(topicId.value);

    if (data === SUCCESS_LIKE) {
      topicDetail.value.liked = true;
      topicDetail.value.likeNumber = String(Number(likeNumber) + 1);
    }
  });
};

const handleTopicEdit = () => {
  handleRequest(async () => {
    const data = await getEditedTopic(topicId.value);
    topicEditor.value?.openDialog();
    topicEditor.value?.editTopic(topicId.value as string, data);
  });
};

const handleTopicBlock = async () => {
  try {
    if (!topicId.value || !topicDetail.value?.title) {
      return;
    }

    const id = topicId.value;
    const { title } = topicDetail.value;
    const { blockedTopicList } = await getStorage();
    const blockedTopic = blockedTopicList.find((item) => item.id === id);

    if (blockedTopic) {
      ElMessage.error(t('enhancedTopic.alreadyBlockTopic'));
      return;
    }

    await ElMessageBox.confirm(t('enhancedTopic.confirmBlockTopic', { title }), t('common.warning'), {
      type: 'warning',
      autofocus: false,
    });

    handleRequest(async () => {
      blockedTopicList.push({
        id,
        title,
      });

      await setStorage({
        blockedTopicList,
      });

      if (!isTopicPage.value) {
        blockTopics([id]);
        closeDialog();
      }

      ElMessage.success(t('enhancedTopic.blockTopicSuccessful'));
    });
  } catch {
    ElMessage(t('common.canceled'));
  }
};

const handleTopicSended = (data: UserTopic) => {
  const {
    detail,
    reply: { total, list },
  } = data;

  topicDetail.value = detail;
  replyTotal.value = total;

  if (isReverseReply.value) {
    loadTopicReplies({
      pageSeeds: [
        {
          page: 1,
          data,
        },
      ],
    });
  } else if (isNestedReplyEnabled.value && topicId.value) {
    startBatchLoad(topicId.value, replyBatchPageCount.value, {
      pageSeeds: [
        {
          page: 1,
          data,
        },
      ],
    });
  } else {
    reloadFirstPageData(list, Number(total));
  }

  setTimeout(scrollToTop, 0);
};

const handleReplySended = (data: UserTopic) => {
  const {
    detail,
    reply: { total, list },
  } = data;

  const oldTotal = Number(replyTotal.value);

  topicDetail.value = detail;
  replyTotal.value = total;

  if (isNestedReplyEnabled.value) {
    if (isReverseReply.value) {
      updateReverseTopBatch(oldTotal, Number(total), list);
    } else {
      updateLastPageData(total, list);
    }
    return;
  }

  if (isReverseReply.value) {
    updateReverseTopPage(oldTotal, Number(total), list);
    return;
  }

  updateCurrentPageData(total, list);
};

const handleTopicDialogOpened = () => {
  blurActiveElement();
  document.addEventListener('keydown', handleKeydown);
  replyEditor.value?.generateCreateHistoryId();
};

const handleTopicDialogBeforeClose: DialogBeforeCloseFn = (done) => {
  if (isImgViewerVisible() || isGlobalLoadingVisible() || replyEditor.value?.isEmojiPickerVisible()) {
    return;
  }

  done();
};

const handleTopicDialogClosed = () => {
  document.removeEventListener('keydown', handleKeydown);
  replyOrderToggleVersion++;

  topicId.value = undefined;
  topicDetail.value = undefined;
  replyTotal.value = '0';
  currentScrollDistance.value = 0;
  initReplyOrder();

  isReplyEditorFullscreen.value = false;
  replyEditor.value?.resetEditHistoryId();
  replyEditor.value?.closeEditor();
  replyEditor.value?.clearContent();
  replyEditor.value?.resetEditorLayout();

  showTopicFooter();
  resetRequestState();
  resetTopicPreloadRequestState();
  resetScrollLoadState();
  resetBatchLoadState();
};

const ARROW_SCROLL_DISTANCE = 50;
const SCROLL_BUTTON_VISIBLE_HEIGHT = 200;
const currentScrollDistance = ref(0);

const handleKeydown = (e: KeyboardEvent) => {
  if (isImgViewerVisible() || isGlobalLoadingVisible()) {
    return;
  }

  const wrapRef = scrollbar.value?.wrapRef;

  if (!wrapRef) {
    return;
  }

  // 如果同时有多个对话框，不处理快捷键
  const overlayEle = [...document.querySelectorAll<HTMLElement>('.el-overlay')].filter(
    (item) => item.style.display !== 'none',
  );

  if (overlayEle.length > 1) {
    return;
  }

  // 如果焦点在输入框中，不处理快捷键
  const activeElement = document.activeElement;

  if (
    activeElement?.tagName === 'INPUT' ||
    activeElement?.tagName === 'TEXTAREA' ||
    activeElement?.closest('.cherry-editor') ||
    activeElement?.closest('.el-select__wrapper') ||
    activeElement?.closest('.el-dropdown') ||
    activeElement?.closest('.el-dropdown__popper')
  ) {
    return;
  }

  // PageUp/PageDown/Space 滚动距离为视口高度的 90%
  const pageScrollDistance = wrapRef.clientHeight * 0.9;

  switch (e.key) {
    case 'Home':
      e.preventDefault();
      scrollToTop();
      break;
    case 'End':
      e.preventDefault();
      scrollToBottom();
      break;
    case 'PageUp':
      e.preventDefault();
      scrollBy({ top: -pageScrollDistance });
      break;
    case 'PageDown':
      e.preventDefault();
      scrollBy({ top: pageScrollDistance });
      break;
    case 'ArrowUp':
      e.preventDefault();
      scrollBy({ top: -ARROW_SCROLL_DISTANCE });
      break;
    case 'ArrowDown':
      e.preventDefault();
      scrollBy({ top: ARROW_SCROLL_DISTANCE });
      break;
    case ' ':
      e.preventDefault();
      scrollBy({ top: e.shiftKey ? -pageScrollDistance : pageScrollDistance }); // Shift + Space 向上翻页，Space 向下翻页
      break;
  }
};

const showScrollTopButton = computed(() => {
  return currentScrollDistance.value > SCROLL_BUTTON_VISIBLE_HEIGHT;
});

const showScrollBottomButton = computed(() => {
  if (!scrollbar.value?.wrapRef) {
    return false;
  }

  const { clientHeight, scrollHeight } = scrollbar.value.wrapRef;
  const remainScrollDistance = scrollHeight - clientHeight - currentScrollDistance.value;
  return remainScrollDistance > SCROLL_BUTTON_VISIBLE_HEIGHT;
});

const handleScroll = ({ scrollTop }: { scrollTop: number }) => {
  currentScrollDistance.value = scrollTop;
};

const updateScrollbar = debounce(() => {
  scrollbar.value?.update();
}, 500);

provide(UPDATE_SCROLLBAR_INJECTION_KEY, updateScrollbar);

const topicEditor = ref<InstanceType<typeof TopicEditor> | null>(null);

const addTopic = (node: string) => {
  topicEditor.value?.openDialog();
  topicEditor.value?.addTopic(node);
};

const replyEditor = ref<InstanceType<typeof ReplyEditor> | null>(null);
const isReplyEditorFullscreen = ref(false);
const topicFooterVisible = ref(true);
const topicFooterHeight = 50;

const replyEditorHeight = computed<number>(() => {
  return isReplyEditorFullscreen.value ? 400 : 315;
});

const currentFooterHeight = computed<number>(() => {
  return topicFooterVisible.value ? topicFooterHeight : replyEditorHeight.value;
});

const topicDialogVH = computed<number>(() => {
  return isTopicPage.value ? calcTopicPageDialogVH() : 92;
});

const topicContainerStyle = computed<CSSProperties>(() => {
  return {
    height: `calc(${topicDialogVH.value}vh - ${addUnit(currentFooterHeight.value)})`,
  };
});

const topicBodyStyle = computed<CSSProperties>(() => {
  return {
    paddingBottom: addUnit(currentFooterHeight.value),
  };
});

const showTopicFooter = () => {
  topicFooterVisible.value = true;
};

const hideTopicFooter = () => {
  topicFooterVisible.value = false;
};

const addReply = (content?: string) => {
  if (import.meta.env.PROD) {
    if (topicStatus.value?.unbindedPhone) {
      ElMessage.error(t('enhancedTopic.cannotReplyByInvalidUser'));
      return;
    }

    if (topicStatus.value?.locked) {
      ElMessage.error(t('enhancedTopic.cannotReplyByLockedPost'));
      return;
    }
  }

  hideTopicFooter();
  replyEditor.value?.openEditor();
  replyEditor.value?.addReply(content);
};

provide(ADD_REPLY_INJECTION_KEY, addReply);

const editReply = (reply: UserReplyItem) => {
  hideTopicFooter();
  replyEditor.value?.openEditor();
  replyEditor.value?.editReply(reply);
};

provide(EDIT_REPLY_INJECTION_KEY, editReply);
</script>

<template>
  <ElementConfig>
    <ElDialog
      v-model="dialogVisible"
      :class="['topic-dialog', { 'topic-page-dialog': isTopicPage }]"
      :modal-class="isTopicPage ? 'topic-overlay' : ''"
      :z-index="isTopicPage ? 1000 : 2000"
      :show-close="false"
      :before-close="handleTopicDialogBeforeClose"
      :close-on-click-modal="!isTopicPage && closeOnClickModal"
      :close-on-press-escape="!isTopicPage"
      align-center
      @opened="handleTopicDialogOpened"
      @closed="handleTopicDialogClosed"
    >
      <template #header="{ close }">
        <div v-if="!isTopicPage" class="topic-dialog-absolute">
          <un-i-mdi-close class="topic-operate-icon" @click="close" />
        </div>
      </template>
      <div v-loading="isLoading || isTopicPreloadLoading || isReplyFirstPageLoading" :style="topicBodyStyle">
        <ElScrollbar ref="scrollbar" @scroll="handleScroll">
          <div
            ref="topicContainer"
            v-infinite-scroll="getNextReplyData"
            v-viewer="viewerOptions"
            class="topic-container"
            :style="topicContainerStyle"
            :infinite-scroll-disabled="disableReplyInfiniteScroll"
            :infinite-scroll-distance="100"
          >
            <TopicDetail v-if="topicDetail" v-bind="topicDetail" />
            <ElDivider v-if="topicDetail" border-style="dashed">
              <un-i-mdi-comment-processing-outline class="comment-icon" />
            </ElDivider>
            <TopicReply
              v-if="showReply && (!isNestedReplyEnabled || replyBatches.length)"
              :total="replyTotal"
              :list="effectiveReplyList"
              :batches="replyBatches"
              :nested-reply-display="nestedReplyDisplay"
              :multiple-inside-one="multipleInsideOne"
              :reverse="isReverseReply"
            />
            <ElSkeleton v-if="isReplyNextPageLoading" animated />
            <ElEmpty
              v-if="topicDetail && replyTotal === '0' && !isReplyFirstPageLoading"
              :description="$t('enhancedTopic.noReply')"
            />
            <LoadError
              v-show="replyLoadError"
              :show-icon="isReplyFirstPage"
              :error-text="$t('common.loadFailedAndRetry')"
              @retry="reloadReplyData"
            />
          </div>
        </ElScrollbar>
        <TopicUserInfoPopover v-if="dialogVisible" :container="topicContainer" />
        <Transition name="el-fade-in-linear" leave-active-class="">
          <ReplyEditor
            ref="replyEditor"
            class="topic-body-absolute"
            :topic-id="topicId"
            :reply-list="effectiveReplyList"
            :height="replyEditorHeight"
            :fullscreen="isReplyEditorFullscreen"
            @sended="handleReplySended"
            @closed="showTopicFooter"
            @toggle-fullscreen="isReplyEditorFullscreen = !isReplyEditorFullscreen"
          />
        </Transition>
        <TopicFooter
          v-show="topicDetail && topicFooterVisible"
          class="topic-body-absolute"
          :topic-id="topicId"
          :topic-title="topicDetail?.title"
          :reply-total="replyTotal"
          :favorited="topicDetail?.favorited"
          :favorite-number="topicDetail?.favoriteNumber"
          :liked="topicDetail?.liked"
          :like-number="topicDetail?.likeNumber"
          :editable="topicDetail?.editable"
          :height="topicFooterHeight"
          :reverse-reply="isReverseReply"
          @favorite-topic="handleTopicFavorite"
          @like-topic="handleTopicLike"
          @edit-topic="handleTopicEdit"
          @block-topic="handleTopicBlock"
          @toggle-reply-order="handleToggleReplyOrder"
        />
      </div>
      <template #footer>
        <div class="topic-dialog-absolute topic-dialog-footer">
          <FadeTransition>
            <un-i-mdi-arrow-up-bold-box-outline
              v-show="showScrollTopButton"
              class="topic-operate-icon"
              @click="scrollToTop"
            />
          </FadeTransition>
          <FadeTransition>
            <un-i-mdi-arrow-down-bold-box-outline
              v-show="showScrollBottomButton"
              class="topic-operate-icon bottom-0"
              @click="scrollToBottom"
            />
          </FadeTransition>
        </div>
      </template>
    </ElDialog>
    <TopicEditor ref="topicEditor" @sended="handleTopicSended" />
  </ElementConfig>
</template>

<style lang="scss">
@import '@/styles/mixin';

.topic-overlay {
  top: var(--gzk-top-navbar-height);
  background-color: transparent;

  & > .el-overlay-dialog {
    top: var(--gzk-top-navbar-height);
  }
}

.topic-dialog,
.mention-replies-popover {
  img {
    max-width: 100%;
  }

  .user-id {
    font-weight: var(--el-font-weight-primary);
    color: var(--el-text-color-regular);

    a {
      color: var(--el-text-color-regular);
    }
  }

  .user-meta {
    color: var(--el-text-color-regular);

    span + span::before {
      color: var(--el-text-color-primary);
      content: ' • ';
    }
  }

  .main-content {
    margin: 15px 0;
    font-size: 14px;
    color: var(--el-text-color-primary);
    word-break: break-all;
    overflow-wrap: anywhere;

    &.markdown-body {
      blockquote {
        font-size: inherit;
      }

      pre > code {
        white-space: pre-wrap;
      }
    }
  }

  .number-info {
    color: var(--el-text-color-secondary);
  }
}

.mention-replies-popover {
  .mention-reply-item-content {
    margin: 0;
  }
}

.gzk-app-img-viewer {
  background-color: rgb(0 0 0 / 30%);
}

.topic-dialog {
  .el-dialog__header {
    padding: 0;
    margin: 0;
  }

  .el-dialog__body {
    padding: 0;
  }

  .el-dialog__footer {
    padding: 0;
  }
}

.editor-dialog {
  display: flex;
  flex-direction: column;

  .el-dialog__body {
    flex: 1;
    padding-top: var(--gzk-topic-padding);
    padding-bottom: var(--gzk-topic-padding);
    overflow: hidden;
  }

  .el-dialog__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.editor-dialog-fullscreen,
.reply-editor-fullscreen {
  .cherry-toolbar {
    .ch-icon-dialog-fullscreen::before {
      content: '\EA42';
    }
  }
}

.editor-dialog-minscreen,
.reply-editor-minscreen {
  .cherry-toolbar {
    .ch-icon-dialog-fullscreen::before {
      content: '\EA41';
    }
  }
}

.topic-dialog,
.topic-editor-dialog,
.reply-editor-dialog,
.editor-help-dialog {
  border-radius: var(--el-border-radius-base);

  .el-dialog__header {
    padding-bottom: 0;
  }
}

.topic-dialog,
.topic-editor-dialog,
.editor-help-dialog {
  width: 45%;

  @include dynamic-width(55%, 60%, 65%, 70%, 75%, 80%, 85%, 90%);
}

.reply-editor-dialog,
.editor-history-dialog {
  width: 40%;

  @include dynamic-width(50%, 55%, 60%, 65%, 70%, 75%, 80%, 85%);
}

.editor-picker-popper {
  .el-select-dropdown__item {
    &:hover,
    &.hover {
      color: var(--el-color-primary);
    }
  }
}
</style>

<style lang="scss" scoped>
.topic-dialog-absolute {
  position: absolute;
  right: -10px;
}

.topic-dialog-footer {
  bottom: 0;
  height: 70px;
}

.topic-operate-icon {
  position: absolute;
  padding: 10px;
  font-size: 32px;
  color: rgb(255 255 255 / 70%);
  cursor: pointer;
}

.topic-container {
  width: 100%;
  padding: var(--gzk-topic-padding);
}

.topic-body-absolute {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
}

.comment-icon {
  font-size: 18px;
  color: var(--el-text-color-secondary);
}
</style>
