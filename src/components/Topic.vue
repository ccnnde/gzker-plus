<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue';
import { ElLoading, ElMessage } from 'element-plus';
import { debounce } from 'lodash-es';

import FadeTransition from '@/transitions/FadeTransition.vue';
import { useDialog } from '@/composables/dialog';
import { useRequest } from '@/composables/request';
import { useScrollLoad } from '@/composables/scroll-load';
import { t } from '@/i18n';
import { favoriteTopic, getEditedTopic, getUserTopic, likeTopic, unfavoriteTopic } from '@/api';
import { request, waitTime } from '@/utils';
import { emitter } from '@/utils/event-bus';
import { handleDialogBeforeClose, viewerOptions, vViewer } from '@/utils/img-viewer';
import { LOADING_BACKGROUND_DARK } from '@/constants';
import {
  ADD_REPLY_INJECTION_KEY,
  EDIT_REPLY_INJECTION_KEY,
  UPDATE_SCROLLBAR_INJECTION_KEY,
} from '@/constants/inject-key';
import { SUCCESS_CANCEL_FAVORITE_TOPIC, SUCCESS_FAVORITE_TOPIC, SUCCESS_LIKE } from '@/constants/res-msg';
import { SELECTOR_TOPIC_LINK } from '@/constants/selector';

import ElementConfig from './ElementConfig.vue';
import LoadError from './LoadError.vue';
import ReplyEditor from './ReplyEditor.vue';
import TopicDetail from './TopicDetail.vue';
import TopicEditor from './TopicEditor.vue';
import TopicFooter from './TopicFooter.vue';
import TopicReply from './TopicReply.vue';

import type { UserReplyItem, UserTopic, UserTopicDetail, UserTopicStatus } from '@/types';

import 'viewerjs/dist/viewer.css';

const PAGE_SIZE = 106;
const topicLinkRegExp = /\/t\/(\d+)(#reply(\d+)?)?$/;
const createTopicLinkRegExp = /\/t\/create\/(\w+)/;

const { dialogVisible, openDialog } = useDialog();
const { isLoading, handleRequest, resetRequestState } = useRequest();
const topicId = ref<string>();
const topicDetail = ref<UserTopicDetail>();
const topicStatus = ref<UserTopicStatus>();
const replyTotal = ref<string>('0');

const showReply = computed(() => {
  return replyTotal.value !== '0';
});

const getTopicCallback = async (page: number): Promise<UserReplyItem[]> => {
  const {
    detail,
    status,
    reply: { total, list },
  } = await getUserTopic(topicId.value, page);

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
  isFirstPageEmpty,
  isNextPageLoading,
  disableInfiniteScroll,
  errorOccurred,
  getFirstPageData,
  getNextPageData,
  reloadPageData,
  reloadFirstPageData,
  updateCurrentPageData,
  resetScrollLoadState,
  scrollToTop,
  scrollToBottom,
} = useScrollLoad<UserReplyItem>(PAGE_SIZE, getTopicCallback);

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

const handleTopicClick = (e: Event) => {
  e.preventDefault();
  openDialog();

  const topicLinkEle = e.target as HTMLAnchorElement;
  topicId.value = topicLinkEle.href.match(topicLinkRegExp)?.[1];
  getFirstPageData();
};

const handleCreateTopicClick = async (e: Event) => {
  e.preventDefault();

  const loading = ElLoading.service({
    background: LOADING_BACKGROUND_DARK,
  });

  try {
    const createTopicLinkEle = e.target as HTMLAnchorElement;
    const { href } = createTopicLinkEle;
    await waitTime();

    if (import.meta.env.PROD) {
      await request(href);
    }

    const node = href.match(createTopicLinkRegExp)?.[1];
    addTopic(node as string);
  } catch (err) {
    ElMessage.error((err as Error).message);
    console.error(err);
  } finally {
    loading.close();
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

const handleTopicSended = (data: UserTopic) => {
  const {
    detail,
    reply: { total, list },
  } = data;

  topicDetail.value = detail;
  replyTotal.value = total;
  reloadFirstPageData(list);
  setTimeout(scrollToTop, 0);
};

const handleReplySended = (data: UserTopic) => {
  const {
    detail,
    reply: { total, list },
  } = data;

  topicDetail.value = detail;
  replyTotal.value = total;
  updateCurrentPageData(total, list);
};

const handleTopicDialogClosed = () => {
  topicId.value = undefined;
  topicDetail.value = undefined;
  replyTotal.value = '0';
  currentScrollDistance.value = 0;
  replyEditor.value?.clearContent();
  resetRequestState();
  resetScrollLoadState();
};

const SCROLL_BUTTON_VISIBLE_HEIGHT = 200;
const currentScrollDistance = ref(0);

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

  replyEditor.value?.openDialog();
  replyEditor.value?.addReply(content);
};

provide(ADD_REPLY_INJECTION_KEY, addReply);

const editReply = (reply: UserReplyItem) => {
  replyEditor.value?.openDialog();
  replyEditor.value?.editReply(reply);
};

provide(EDIT_REPLY_INJECTION_KEY, editReply);
</script>

<template>
  <ElementConfig>
    <ElDialog
      v-model="dialogVisible"
      class="topic-dialog"
      :z-index="2000"
      :show-close="false"
      :before-close="handleDialogBeforeClose"
      :close-on-click-modal="false"
      align-center
      @closed="handleTopicDialogClosed"
    >
      <template #header="{ close }">
        <div class="topic-dialog-absolute">
          <un-i-mdi-close class="topic-operate-icon" @click="close" />
        </div>
      </template>
      <div v-loading="isLoading || isFirstPageLoading">
        <ElScrollbar ref="scrollbar" @scroll="handleScroll">
          <div
            v-infinite-scroll="getNextPageData"
            v-viewer="viewerOptions"
            class="topic-container"
            :infinite-scroll-disabled="disableInfiniteScroll"
            :infinite-scroll-distance="100"
          >
            <TopicDetail v-if="topicDetail" v-bind="topicDetail" />
            <ElDivider v-if="topicDetail" border-style="dashed">
              <un-i-mdi-comment-processing-outline class="comment-icon" />
            </ElDivider>
            <TopicReply v-if="showReply" :total="replyTotal" :list="replyList" />
            <ElSkeleton v-if="isNextPageLoading" animated />
            <ElEmpty v-if="topicDetail && isFirstPageEmpty" :description="$t('enhancedTopic.noReply')" />
            <LoadError
              v-show="errorOccurred"
              :show-icon="isFirstPage"
              :error-text="$t('common.loadFailedAndRetry')"
              @retry="reloadPageData"
            />
          </div>
        </ElScrollbar>
        <TopicFooter
          v-if="topicDetail"
          :topic-id="topicId"
          :topic-title="topicDetail.title"
          :reply-total="replyTotal"
          :favorited="topicDetail.favorited"
          :favorite-number="topicDetail.favoriteNumber"
          :liked="topicDetail.liked"
          :like-number="topicDetail.likeNumber"
          :editable="topicDetail.editable"
          @favorite-topic="handleTopicFavorite"
          @like-topic="handleTopicLike"
          @edit-topic="handleTopicEdit"
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
    <ReplyEditor ref="replyEditor" :topic-id="topicId" :reply-list="replyList" @sended="handleReplySended" />
  </ElementConfig>
</template>

<style lang="scss">
@import '@/styles/mixin';

.topic-dialog,
.conversation-dialog {
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
    color: var(--el-text-color-primary);
    word-break: break-all;
  }

  .number-info {
    color: var(--el-text-color-secondary);
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

.editor-dialog-fullscreen {
  .cherry-toolbar {
    .ch-icon-dialog-fullscreen::before {
      content: '\EA42';
    }
  }
}

.editor-dialog-minscreen {
  .cherry-toolbar {
    .ch-icon-dialog-fullscreen::before {
      content: '\EA41';
    }
  }
}

.topic-dialog,
.topic-editor-dialog,
.reply-editor-dialog,
.conversation-dialog,
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
.editor-history-dialog,
.conversation-dialog {
  width: 40%;

  @include dynamic-width(50%, 55%, 60%, 65%, 70%, 75%, 80%, 85%);
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
  height: 85vh;
  padding: var(--gzk-topic-padding);
}

.comment-icon {
  font-size: 18px;
  color: var(--el-text-color-secondary);
}
</style>
