<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { API_USER } from '@/api';
import { addUnit } from '@/utils';
import { initialElementPositionAndSize } from '@/constants';
import { SELECTOR_USER_AVATAR } from '@/constants/selector';

import ElementConfig from './ElementConfig.vue';
import UserInfoPopover from './UserInfoPopover.vue';

let avatarHoverTimer: number | undefined;

const avatarWrapperStyle = ref(initialElementPositionAndSize);
const uid = ref('');

const userLink = computed(() => {
  return `${API_USER}${uid.value}`;
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
    const { href } = avatarEle.parentNode as HTMLAnchorElement;
    const { left, top, width, height } = avatarEle.getBoundingClientRect();

    uid.value = href.split(API_USER)[1];

    avatarWrapperStyle.value = {
      left: addUnit(left),
      top: addUnit(top + document.documentElement.scrollTop),
      width: addUnit(width),
      height: addUnit(height),
    };
  }, 100);
};

const handleAvatarMouseLeave = () => {
  clearTimeout(avatarHoverTimer);
};

const handlePopoverHide = () => {
  uid.value = '';
  avatarWrapperStyle.value = initialElementPositionAndSize;
};
</script>

<template>
  <ElementConfig>
    <UserInfoPopover :uid="uid" :show-after="200" :hide-after="0" @hide="handlePopoverHide">
      <a class="avatar-wrapper" :style="avatarWrapperStyle" :href="userLink" target="_blank"></a>
    </UserInfoPopover>
  </ElementConfig>
</template>

<style lang="scss" scoped>
.avatar-wrapper {
  position: absolute;
  cursor: pointer;
  border-radius: var(--gzk-avatar-border-radius);

  &::before,
  &::after {
    position: absolute;
    right: 0;
    left: 0;
    height: 20px;
    content: '';
    background-color: transparent;
  }

  &::before {
    top: -20px;
  }

  &::after {
    bottom: -20px;
  }
}
</style>
