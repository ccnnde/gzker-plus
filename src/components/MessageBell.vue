<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { useRequest } from '@/composables/request';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { API_MSG, getUnreadUserMsgNum, getUserMsgList } from '@/api';
import { waitTime } from '@/utils';
import { BellStyle, OptionsKey, ReplyType } from '@/constants';

import LoadError from './LoadError.vue';

import type { DirectiveBinding } from 'vue';
import type { ElScrollbar } from 'element-plus';
import type { UserMessage } from '@/types';

const PAGE_SIZE = 36;

/**
 * 将消息内容的指定元素替换为指定文本
 * v-msg-replace:selector="[text]"
 */
const vMsgReplace = {
  mounted: (el: HTMLDivElement, binding: DirectiveBinding<string | undefined>) => {
    const { value, arg } = binding;

    if (!value || !arg) {
      console.error('The value or arg of directive [v-msg-replace] is undefined');
      return;
    }

    const elementsToReplace = el.querySelectorAll(arg);

    elementsToReplace.forEach((element) => {
      const textNode = new Text(value);
      element.parentElement?.replaceChild(textNode, element);
    });
  },
};

const storage = useStorageStore();
const { options } = storeToRefs(storage);

const { isLoading, errorOccurred, handleRequest, resetRequestState } = useRequest();
const disableTooltip = ref(false);
const disableBadge = ref(false);
const unreadMessageNumber = ref(getUnreadUserMsgNum());
const userMessageList = ref<UserMessage[]>([]);
const currentPage = ref(1);
const noMoreData = ref(true);
const scrollbar = ref<InstanceType<typeof ElScrollbar> | null>(null);

const bellTip = computed(() => {
  if (unreadMessageNumber.value === 0) {
    return t('gzkHeader.message');
  }

  return t('gzkHeader.unreadMessage', { num: unreadMessageNumber.value });
});

const bellStyle = computed(() => {
  if (!options.value) {
    return BellStyle.None;
  }

  return options.value[OptionsKey.EnhancedMsg].bellStyle;
});

const showBell = computed(() => {
  return bellStyle.value !== BellStyle.None;
});

const hideBadge = computed(() => {
  return !showBell.value || bellStyle.value === BellStyle.Normal || unreadMessageNumber.value === 0;
});

const isBadgeDot = computed(() => {
  return bellStyle.value === BellStyle.BadgeDot;
});

const isFirstPage = computed(() => {
  return currentPage.value === 1;
});

const isFirstPageLoading = computed(() => {
  return isFirstPage.value && isLoading.value;
});

const isFirstPageEmpty = computed(() => {
  return isFirstPage.value && !errorOccurred.value && userMessageList.value.length === 0;
});

const isNextPageLoading = computed(() => {
  return !isFirstPage.value && isLoading.value;
});

const disableInfiniteScroll = computed(() => {
  return isNextPageLoading.value || errorOccurred.value || noMoreData.value;
});

watch(isNextPageLoading, async () => {
  if (!isNextPageLoading.value) {
    return;
  }

  await nextTick();

  scrollbar.value?.scrollTo({
    top: scrollbar.value.wrapRef?.scrollHeight,
  });
});

const handlePopoverShow = () => {
  disableTooltip.value = true;

  handleRequest(async () => {
    const firstPageData = await getUserMsgList(currentPage.value);

    await waitTime();

    userMessageList.value = firstPageData;
    noMoreData.value = firstPageData.length < PAGE_SIZE;
  });
};

const handleScrollLoad = () => {
  currentPage.value++;

  handleRequest(async () => {
    const nextPageData = await getUserMsgList(currentPage.value);
    const nextPageNumber = nextPageData.length;

    await waitTime();

    if (nextPageNumber === 0) {
      currentPage.value--;
    }

    noMoreData.value = nextPageNumber < PAGE_SIZE;
    userMessageList.value.push(...nextPageData);
  });
};

const handleRetry = () => {
  errorOccurred.value = false;

  if (isFirstPage.value) {
    handlePopoverShow();
    return;
  }

  currentPage.value--;
  handleScrollLoad();
};

const handlePopoverHide = () => {
  disableTooltip.value = false;
  disableBadge.value = true;
  userMessageList.value = [];
  currentPage.value = 1;
  noMoreData.value = true;
  resetRequestState();

  setTimeout(() => {
    unreadMessageNumber.value = 0;
    disableBadge.value = false;
  }, 500);
};

const isMsgUnread = (index: number): boolean => {
  const messageIndex = index + 1;
  return messageIndex <= unreadMessageNumber.value;
};
</script>

<template>
  <ElPopover
    :width="350"
    :popper-style="{ padding: 0 }"
    trigger="click"
    @show="handlePopoverShow"
    @hide="handlePopoverHide"
  >
    <template #reference>
      <div>
        <ElTooltip v-if="showBell" :content="bellTip" :show-arrow="false" :disabled="disableTooltip">
          <ElBadge :value="unreadMessageNumber" :max="99" :hidden="disableBadge || hideBadge" :is-dot="isBadgeDot">
            <un-i-mdi-bell-outline class="header-icon" />
          </ElBadge>
        </ElTooltip>
      </div>
    </template>
    <template #default>
      <div class="message-list-header">
        <span>{{ $t('gzkHeader.message') }}</span>
        <ElLink class="message-all" type="info" :underline="false" :href="API_MSG" target="_blank">
          {{ $t('enhancedMsg.viewAll') }}
          <un-i-mdi-arrow-top-right-thick />
        </ElLink>
      </div>
      <ElScrollbar ref="scrollbar">
        <div
          v-loading="isFirstPageLoading"
          v-infinite-scroll="handleScrollLoad"
          class="message-list-content"
          :infinite-scroll-disabled="disableInfiniteScroll"
          :infinite-scroll-distance="100"
        >
          <div
            v-for="(item, index) in userMessageList"
            :key="index"
            :class="{
              'message-item': true,
              'message-unread': isMsgUnread(index),
            }"
          >
            <a :href="item.userLink" target="_blank">
              <img class="message-avatar" :src="item.avatarUrl" />
            </a>
            <div class="message-main">
              <div class="message-title">
                <a class="message-link" :href="item.userLink" target="_blank">
                  {{ item.uid }}
                </a>
                <template v-if="item.replyType === ReplyType.Topic">
                  <span class="message-action">{{ $t('enhancedMsg.replyYou') }}</span>
                  <a class="message-link" :href="item.topicLink" target="_blank">
                    {{ item.topicTitle }}
                  </a>
                </template>
                <template v-else-if="item.replyType === ReplyType.Mention">
                  <span class="message-action">{{ $t('enhancedMsg.inTopic') }}</span>
                  <a class="message-link" :href="item.topicLink" target="_blank">
                    {{ item.topicTitle }}
                  </a>
                  <span class="message-action">{{ $t('enhancedMsg.mentionYou') }}</span>
                </template>
              </div>
              <div v-msg-replace:img="$t('enhancedMsg.image')" class="message-content" v-html="item.replyContent"></div>
            </div>
          </div>
          <ElSkeleton v-show="isNextPageLoading" class="message-item message-item-skeleton" animated>
            <template #template>
              <ElSkeletonItem class="message-avatar" variant="image" />
              <div class="message-main">
                <div class="message-title">
                  <ElSkeletonItem variant="text" />
                </div>
                <div class="message-content">
                  <ElSkeletonItem variant="text" />
                  <ElSkeletonItem variant="text" style="width: 50%" />
                </div>
              </div>
            </template>
          </ElSkeleton>
          <ElEmpty v-show="isFirstPageEmpty" />
          <LoadError
            v-show="errorOccurred"
            :show-icon="isFirstPage"
            :error-text="$t('common.loadFailedAndRetry')"
            @retry="handleRetry"
          />
        </div>
      </ElScrollbar>
    </template>
  </ElPopover>
</template>

<style lang="scss">
a.notification-indicator .mail-status {
  &,
  &.unread {
    background-color: #ddd;
    background-image: none;
  }
}
</style>

<style lang="scss" scoped>
$msg-padding: 15px;

.message-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $msg-padding;
  font-size: 14px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color);

  .message-all {
    text-decoration: none;
  }
}

.message-list-content {
  height: 400px;

  .message-item {
    position: relative;
    display: flex;
    align-items: flex-start;
    padding: $msg-padding;

    &:not(:first-child)::before {
      position: absolute;
      top: -1px;
      right: $msg-padding;
      left: $msg-padding;
      height: 1px;
      content: '';
      background-color: var(--el-border-color);
    }
  }
}

.message-unread {
  background-color: var(--el-color-primary-light-9);
}

.message-avatar {
  width: 40px;
  height: 40px;
  margin-top: 5px;
  margin-right: 10px;
  border-radius: 3px;
}

.message-main {
  flex: 1;
}

.message-title {
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: bold;
  line-height: 18px;
  color: var(--el-text-color-primary);
}

.message-action {
  margin: 0 5px;
}

.message-link {
  color: var(--el-color-primary);
  cursor: pointer;
  transition: color 0.1s ease-in;

  &:hover {
    color: var(--el-color-primary-light-3);
  }
}

.message-content {
  font-size: 13px;
  color: var(--el-text-color-regular);

  :deep(a) {
    color: var(--el-text-color-regular);
  }
}

.message-item-skeleton {
  .message-avatar {
    margin-top: 0;
  }

  .message-title {
    margin-bottom: 0;
  }
}
</style>
