<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  title: string;
  icon?: string;
}

const props = defineProps<Props>();

const iconClass = computed(() => {
  return props.icon || 'w-5';
});
</script>

<template>
  <div :class="iconClass" text-xl></div>
  <span class="ml-3 text-lg">{{ title }}</span>
</template>
