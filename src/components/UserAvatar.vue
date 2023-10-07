<script setup lang="ts">
import { computed } from 'vue';

import { addUnit } from '@/utils';

import UserInfoPopover from './UserInfoPopover.vue';

import type { CSSProperties } from 'vue';

interface Props {
  uid?: string;
  userLink?: string;
  avatarUrl?: string;
  avatarSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  uid: '',
  userLink: '',
  avatarUrl: '',
  avatarSize: 40,
});

const imgStyle = computed<CSSProperties>(() => {
  const size = addUnit(props.avatarSize);

  return {
    width: size,
    height: size,
  };
});
</script>

<template>
  <UserInfoPopover :uid="uid" :show-after="300">
    <a :href="userLink" target="_blank">
      <img class="avatar-img" :style="imgStyle" :src="avatarUrl" />
    </a>
  </UserInfoPopover>
</template>

<style lang="scss" scoped>
.avatar-img {
  border-radius: var(--gzk-avatar-border-radius);
}
</style>
