<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  icon?: string;
}

const props = defineProps<Props>();

const iconClass = computed(() => {
  return props.icon || 'uno-w-5';
});
</script>

<template>
  <div :class="[iconClass, 'uno-text-xl']"></div>
  <span class="uno-ml-3 uno-text-lg">{{ title }}</span>
</template>
