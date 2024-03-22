<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';

import { useRequest } from '@/composables/request';
import { useStorageStore } from '@/stores/storage';
import { API_USER, blockUser, followUser, getUserInfo, unblockUser } from '@/api';

import LoadError from './LoadError.vue';

import type { PopoverProps } from 'element-plus';
import type { UserInfo } from '@/types';

interface Props extends Partial<PopoverProps> {
  uid: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  hide: [];
}>();

const storage = useStorageStore();
const { settings } = storeToRefs(storage);

const { isLoading, errorOccurred, handleRequest, resetRequestState } = useRequest();
const userInfo = ref<UserInfo>();

const isUserMySelf = computed(() => {
  return userInfo.value?.uid === settings.value?.loginUserId;
});

const handlePopoverShow = () => {
  handleRequest(async () => {
    userInfo.value = await getUserInfo(props.uid);
  });
};

const handlePopoverHide = () => {
  userInfo.value = undefined;
  resetRequestState();
  emit('hide');
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

    if (blocked) {
      userInfo.value = await unblockUser(memberNo);
    } else {
      userInfo.value = await blockUser(memberNo);
    }
  });
};
</script>

<template>
  <ElPopover
    :width="300"
    :show-after="showAfter"
    :hide-after="hideAfter"
    :disabled="!uid"
    placement="top"
    @show="handlePopoverShow"
    @hide="handlePopoverHide"
  >
    <template #reference>
      <slot></slot>
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
              <span class="user-statistic-type">{{ $t('common.reply') }}</span>
              <span class="user-statistic-value">{{ userInfo.replyNumber }}</span>
            </ElCol>
            <ElCol class="user-statistic-info" :span="6" @click="openUserPage('/favorites')">
              <span class="user-statistic-type">{{ $t('common.favorite') }}</span>
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
              <ElButton class="user-operate-btn" type="primary" plain :disabled="isUserMySelf" @click="handleUserBlock">
                {{ userInfo.blocked ? $t('floatUserInfo.blocked') : $t('floatUserInfo.block') }}
              </ElButton>
            </ElCol>
          </ElRow>
        </template>
        <LoadError v-else-if="errorOccurred" />
      </div>
    </template>
  </ElPopover>
</template>

<style lang="scss" scoped>
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
  border-radius: var(--gzk-avatar-border-radius);
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
  color: var(--el-text-color-primary);
}

.user-statistic-type {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.user-statistic-value {
  font-size: 15px;
  color: var(--el-text-color-primary);
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
