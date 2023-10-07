<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue';
import { debounce } from 'lodash-es';
import { directive as viewer } from 'v-viewer';

import FadeTransition from '@/transitions/FadeTransition.vue';
import { useRequest } from '@/composables/request';
import { useScrollLoad } from '@/composables/scroll-load';
import { favoriteTopic, getUserTopic, likeTopic, unfavoriteTopic } from '@/api';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';
import { SUCCESS_CANCEL_FAVORITE_TOPIC, SUCCESS_FAVORITE_TOPIC, SUCCESS_LIKE } from '@/constants/res-msg';
import { SELECTOR_TOPIC_LINK } from '@/constants/selector';

import ElementConfig from './ElementConfig.vue';
import LoadError from './LoadError.vue';
import TopicDetail from './TopicDetail.vue';
import TopicFooter from './TopicFooter.vue';
import TopicReply from './TopicReply.vue';

import type { DialogBeforeCloseFn } from 'element-plus';
import type Viewer from 'viewerjs';
import type { ImageViewer, UserReplyItem, UserTopicDetail } from '@/types';

import 'viewerjs/dist/viewer.css';

const VIEWER_CLASS_NAME = 'gzk-app-img-viewer';
const vViewer = viewer();
const viewerOptions: Viewer.Options = {
  className: VIEWER_CLASS_NAME,
  title(this: ImageViewer, image: HTMLImageElement) {
    return `${image.alt} (${this.index + 1}/${this.length})`;
  },
  filter(image: HTMLImageElement) {
    const { src } = image;
    const isImgGzkStaticRes = src.match(/guozaoke.com\/(\/)?static\/(avatar|emoji)/);
    const isImgSinaExpression = src.includes('face.t.sinajs.cn/t4/appstyle/expression');
    const isImgBaiduExpression = src.includes('img.whzxc.cn/bd');

    if (isImgGzkStaticRes || isImgSinaExpression || isImgBaiduExpression) {
      return false;
    }

    image.style.cursor = 'zoom-in';

    return true;
  },
};

const PAGE_SIZE = 106;
const topicLinkRegExp = /\/t\/(\d+)(#reply(\d+)?)?$/;

const { isLoading, handleRequest, resetRequestState } = useRequest();
const topicId = ref<string>();
const topicDialogVisible = ref(false);
const topicDetail = ref<UserTopicDetail>();
const replyTotal = ref<string>('0');

const showReply = computed(() => {
  return replyTotal.value !== '0';
});

const getTopicCallback = async (page: number): Promise<UserReplyItem[]> => {
  const {
    detail,
    reply: { total, list },
  } = await getUserTopic(topicId.value, page);

  topicDetail.value = detail;
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
  resetScrollLoadState,
  scrollToTop,
  scrollToBottom,
} = useScrollLoad<UserReplyItem>(PAGE_SIZE, getTopicCallback);

onMounted(() => {
  const topicLinkElements = document.querySelectorAll<HTMLAnchorElement>(SELECTOR_TOPIC_LINK);

  topicLinkElements.forEach((element) => {
    const { href } = element;

    if (!href.match(topicLinkRegExp)) {
      return;
    }

    element.addEventListener('click', handleTopicClick);
  });
});

const handleTopicClick = async (e: Event) => {
  e.preventDefault();
  topicDialogVisible.value = true;

  const topicLinkEle = e.target as HTMLAnchorElement;
  topicId.value = topicLinkEle.href.match(topicLinkRegExp)?.[1];
  getFirstPageData();
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

const handleTopicDialogClosed = () => {
  topicId.value = undefined;
  topicDetail.value = undefined;
  replyTotal.value = '0';
  currentScrollDistance.value = 0;
  resetRequestState();
  resetScrollLoadState();
};

const handleTopicDialogBeforeClose: DialogBeforeCloseFn = (done) => {
  const imgViewer = document.querySelector(`.${VIEWER_CLASS_NAME}.viewer-container.viewer-in`);

  if (!imgViewer) {
    done();
  }
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
</script>

<template>
  <ElementConfig>
    <ElDialog
      v-model="topicDialogVisible"
      class="topic-dialog"
      :z-index="2000"
      :show-close="false"
      :before-close="handleTopicDialogBeforeClose"
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
          @favorite-topic="handleTopicFavorite"
          @like-topic="handleTopicLike"
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
  </ElementConfig>
</template>

<style lang="scss">
#gzk-app-topic {
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
  }

  .number-info {
    color: var(--el-text-color-secondary);
  }
}

.gzk-app-img-viewer {
  background-color: rgb(0 0 0 / 30%);
}

.topic-dialog {
  width: 45%;
  border-radius: var(--el-border-radius-base);

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

  @media (width <= 1700px) {
    width: 55%;
  }

  @media (width <= 1600px) {
    width: 60%;
  }

  @media (width <= 1500px) {
    width: 65%;
  }

  @media (width <= 1400px) {
    width: 70%;
  }

  @media (width <= 1300px) {
    width: 75%;
  }

  @media (width <= 1200px) {
    width: 80%;
  }

  @media (width <= 1100px) {
    width: 85%;
  }

  @media (width <= 1000px) {
    width: 90%;
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
  height: 85vh;
  padding: var(--gzk-topic-padding);
}

.comment-icon {
  font-size: 18px;
  color: var(--el-text-color-secondary);
}
</style>
