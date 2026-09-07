<script setup lang="ts">
import { computed, inject } from 'vue';

import { vImgLoad } from '@/directives';
import { linkifyContent } from '@/utils/reply-content';
import { UPDATE_SCROLLBAR_INJECTION_KEY } from '@/constants/inject-key';

interface Props {
  content?: string;
  replyNo?: string;
  replyTime?: string;
}

const props = defineProps<Props>();

const renderedContent = computed(() => {
  return linkifyContent(props.content || '');
});

const updateScrollbar = inject(UPDATE_SCROLLBAR_INJECTION_KEY);

const handleAnimationEnd = (event: AnimationEvent) => {
  const replyElement = event.currentTarget;

  if (replyElement instanceof HTMLElement) {
    replyElement.classList.remove('mention-reply-item-flash');
  }
};
</script>

<template>
  <li class="mention-reply-item-container" :data-reply-no="replyNo" @animationend.self="handleAnimationEnd">
    <div
      v-img-load="updateScrollbar"
      class="main-content markdown-body mention-reply-item-content"
      v-html="renderedContent"
    ></div>
    <time v-if="replyTime" class="mention-reply-item-time">
      {{ replyTime }}
    </time>
  </li>
</template>

<style lang="scss" scoped>
.mention-reply-item-container {
  position: relative;
  padding: 2px 12px 2px 30px;

  &::before {
    position: absolute;
    top: 2px;
    left: 18px;
    font-size: 9px;
    line-height: 21px;
    color: var(--el-text-color-primary);
    content: '•';
  }

  &.mention-reply-item-flash {
    animation: mention-reply-item-flash 800ms ease-out;
  }
}

.mention-reply-item-content {
  &::before {
    display: none;
  }
}

.mention-reply-item-time {
  display: block;
  margin-top: 4px;
  font-size: var(--el-font-size-extra-small);
  line-height: 1.2;
  color: var(--el-text-color-secondary);
  text-align: right;
}

@keyframes mention-reply-item-flash {
  0%,
  100% {
    background-color: transparent;
  }

  35% {
    background-color: var(--el-color-primary-light-9);
  }
}
</style>
