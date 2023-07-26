<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useRequest } from '@/composables/request';
import { API_USER, blockUser, followUser, getUserInfo, unblockUser } from '@/api';
import { addUnit } from '@/utils';
import { initialElementPositionAndSize } from '@/constants';
import { SELECTOR_LOGIN_USER_LINK, SELECTOR_USER_AVATAR } from '@/constants/selector';

import ElementConfig from './ElementConfig.vue';
import LoadError from './LoadError.vue';

import type { UserInfo } from '@/types';

const loginUserLinkEle = document.querySelector(SELECTOR_LOGIN_USER_LINK) as HTMLAnchorElement | null;
const loginUserId = loginUserLinkEle?.href.split(API_USER)[1];
let avatarHoverTimer: number | undefined;

const { isLoading, errorOccurred, handleRequest, resetRequestState } = useRequest();
const avatarWrapperStyle = ref(initialElementPositionAndSize);
const userInfo = ref<UserInfo>();

const isUserMySelf = computed(() => {
  return userInfo.value?.uid === loginUserId;
});

onMounted(() => {
  const avatarElements = document.querySelectorAll<HTMLImageElement>(SELECTOR_USER_AVATAR);

  avatarElements.forEach((element) => {
    element.addEventListener('mouseenter', handleAvatarMouseEnter);
    element.addEventListener('mouseleave', handleAvatarMouseLeave);
  });
});

const handleAvatarMouseEnter = (e: Event) => {
  avatarHoverTimer = setTimeout(() => {
    const avatarEle = e.target as HTMLImageElement;
    const { left, top, width, height } = avatarEle.getBoundingClientRect();

    avatarWrapperStyle.value = {
      left: addUnit(left),
      top: addUnit(top + document.documentElement.scrollTop),
      width: addUnit(width),
      height: addUnit(height),
    };

    handleRequest(async () => {
      const { href } = avatarEle.parentNode as HTMLAnchorElement;
      const uid = href.split(API_USER)[1];
      userInfo.value = await getUserInfo(uid);
    });
  }, 500);
};

const handleAvatarMouseLeave = () => {
  clearTimeout(avatarHoverTimer);
};

const handlePopoverHide = () => {
  userInfo.value = undefined;
  avatarWrapperStyle.value = initialElementPositionAndSize;
  resetRequestState();
};

const openUserPage = (path: string = '') => {
  window.open(`${API_USER}${userInfo.value?.uid}${path}`);
};

const handleUserFollow = () => {
  handleRequest(async () => {
    if (!userInfo.value) {
      return;
    }

    userInfo.value = await followUser(userInfo.value.uid);
  });
};

const handleUserBlock = () => {
  handleRequest(async () => {
    if (!userInfo.value) {
      return;
    }

    const { memberNo, blocked } = userInfo.value;
    userInfo.value = blocked ? await unblockUser(memberNo) : await blockUser(memberNo);
  });
};
</script>

<template>
  <ElementConfig>
    <ElPopover :width="300" :hide-after="100" placement="top" @hide="handlePopoverHide">
      <template #reference>
        <div class="avatar-wrapper" :style="avatarWrapperStyle" @click="openUserPage()"></div>
      </template>
      <template #default>
        <div v-loading="isLoading" class="user-info-container">
          <template v-if="userInfo">
            <div class="user-basic-info">
              <img class="user-basic-info-avatar" :src="userInfo.avatarUrl" />
              <div class="user-basic-info-detail">
                <div class="user-basic-info-item">
                  <un-i-mdi-account class="user-basic-info-icon" />
                  <span class="user-basic-info-text cursor-pointer" @click="openUserPage()">{{ userInfo.uid }}</span>
                </div>
                <div class="user-basic-info-item">
                  <un-i-mdi-alpha-n-circle-outline class="user-basic-info-icon" />
                  <span class="user-basic-info-text">
                    {{ $t('floatUserInfo.memberNo', { no: userInfo.memberNo }) }}
                  </span>
                </div>
                <div class="user-basic-info-item">
                  <un-i-mdi-office-building-marker class="user-basic-info-icon" />
                  <span class="user-basic-info-text">
                    {{ $t('floatUserInfo.checkInTime', { time: userInfo.checkInTime }) }}
                  </span>
                </div>
              </div>
            </div>
            <ElRow>
              <ElCol class="user-statistic-info" :span="6" @click="openUserPage('/topics')">
                <span class="user-statistic-type">{{ $t('floatUserInfo.topic') }}</span>
                <span class="user-statistic-value">{{ userInfo.topicNumber }}</span>
              </ElCol>
              <ElCol class="user-statistic-info" :span="6" @click="openUserPage('/replies')">
                <span class="user-statistic-type">{{ $t('floatUserInfo.reply') }}</span>
                <span class="user-statistic-value">{{ userInfo.replyNumber }}</span>
              </ElCol>
              <ElCol class="user-statistic-info" :span="6" @click="openUserPage('/favorites')">
                <span class="user-statistic-type">{{ $t('floatUserInfo.favorite') }}</span>
                <span class="user-statistic-value">{{ userInfo.favoriteNumber }}</span>
              </ElCol>
              <ElCol class="user-statistic-info user-statistic-credit" :span="6">
                <span class="user-statistic-type">{{ $t('floatUserInfo.credit') }}</span>
                <span class="user-statistic-value">{{ userInfo.creditValue }}</span>
              </ElCol>
            </ElRow>
            <ElRow :gutter="10">
              <ElCol :span="12">
                <ElButton class="user-operate-btn" type="primary" :disabled="isUserMySelf" @click="handleUserFollow">
                  {{ userInfo.followed ? $t('floatUserInfo.followed') : $t('floatUserInfo.follow') }}
                </ElButton>
              </ElCol>
              <ElCol :span="12">
                <ElButton
                  class="user-operate-btn"
                  type="primary"
                  plain
                  :disabled="isUserMySelf"
                  @click="handleUserBlock"
                >
                  {{ userInfo.blocked ? $t('floatUserInfo.blocked') : $t('floatUserInfo.block') }}
                </ElButton>
              </ElCol>
            </ElRow>
          </template>
          <LoadError v-else-if="errorOccurred" />
        </div>
      </template>
    </ElPopover>
  </ElementConfig>
</template>

<style lang="scss" scoped>
.avatar-wrapper {
  position: absolute;
  cursor: pointer;
  border-radius: 3px;

  &::before {
    position: absolute;
    top: -20px;
    right: 0;
    left: 0;
    height: 20px;
    content: '';
    background-color: transparent;
  }
}

.user-info-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 165px;
}

.user-basic-info {
  display: flex;
  align-items: stretch;
  height: 65px;
}

.user-basic-info-avatar {
  height: 100%;
  margin-right: 10px;
  border-radius: 3px;
}

.user-basic-info-detail {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.user-basic-info-item {
  display: flex;
  align-items: center;
}

.user-basic-info-icon {
  margin-right: 3px;
  font-size: 15px;
  color: #8d8f92;
}

.user-basic-info-text {
  font-size: 13px;
  color: #303133;
}

.user-statistic-type {
  font-size: 12px;
  color: #606266;
}

.user-statistic-value {
  font-size: 15px;
  color: #303133;
}

.user-statistic-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;

  &:hover {
    .user-statistic-type,
    .user-statistic-value {
      color: var(--el-color-primary);
    }
  }
}

.user-statistic-credit {
  cursor: default;
}

.user-operate-btn {
  width: 100%;
}
</style>
