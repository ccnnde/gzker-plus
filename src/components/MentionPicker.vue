<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { ElSelect } from 'element-plus';
import { debounce } from 'lodash-es';

import { useEditorPicker } from '@/composables/editor-picker';
import { searchMentionUsers } from '@/api';
import { GZK_AI_AGENT_UID } from '@/constants';

import type { MentionUser } from '@/types';

interface Props {
  users: MentionUser[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  picked: [username: string, user?: MentionUser];
  hide: [];
}>();

const query = ref('');
const remoteUsers = ref<MentionUser[]>([]);
const cachedAiAgent = ref<MentionUser>();
const isSearching = ref(false);
let searchController: AbortController | undefined;

const normalize = (value: string) => {
  return value.normalize('NFKC').toLowerCase();
};

const matchingUsers = computed(() => {
  const term = normalize(query.value);
  const matches = new Map<string, MentionUser>();

  for (const user of props.users) {
    const username = normalize(user.username);
    const displayName = normalize(user.display_name);

    if (username.includes(term) || displayName.includes(term)) {
      matches.set(username, user);
    }
  }

  for (const user of remoteUsers.value) {
    const username = normalize(user.username);
    const localUser = matches.get(username);
    matches.set(username, { ...user, avatar: user.avatar || localUser?.avatar });
  }

  return [...matches.values()];
});

const searchUsers = debounce(async (term: string, controller: AbortController) => {
  isSearching.value = true;

  try {
    const results = await searchMentionUsers(term || GZK_AI_AGENT_UID, controller.signal);

    if (controller.signal.aborted) {
      return;
    }

    const aiAgent = results.find(isAiAgent);

    if (aiAgent) {
      cachedAiAgent.value = aiAgent;
    }

    const defaultResults = aiAgent ? [aiAgent] : [];
    remoteUsers.value = term ? results : defaultResults;
  } catch {
    // Local suggestions remain available when the search fails.
  } finally {
    if (!controller.signal.aborted) {
      isSearching.value = false;
    }
  }
}, 300);

const isAiAgent = (user: MentionUser) => {
  return normalize(user.username) === GZK_AI_AGENT_UID;
};

const stopSearch = () => {
  searchController?.abort();
  searchUsers.cancel();
  isSearching.value = false;
};

const filterUsers = (term: string) => {
  stopSearch();

  query.value = term.trim();
  remoteUsers.value = [];

  if (!query.value) {
    const localAiAgent = props.users.find(isAiAgent);

    if (localAiAgent?.uid && localAiAgent.avatar) {
      return;
    }

    if (cachedAiAgent.value) {
      remoteUsers.value = [cachedAiAgent.value];
      return;
    }
  }

  searchController = new AbortController();
  searchUsers(query.value, searchController);
};

onBeforeUnmount(stopSearch);

const hideBrokenAvatar = (event: Event) => {
  if (event.currentTarget instanceof HTMLImageElement) {
    event.currentTarget.style.visibility = 'hidden';
  }
};

const handleSelect = (username: string) => {
  if (!username) {
    return;
  }

  const selectedUsername = normalize(username);
  const user = matchingUsers.value.find((item) => {
    return normalize(item.username) === selectedUsername;
  });
  emit('picked', username, user);
};

const handleHide = () => {
  stopSearch();
  emit('hide');
};

const {
  select,
  isPickerVisible,
  popperStyle,
  showPicker: openPicker,
  hidePicker,
  handleFocus,
  handleVisibleChange,
} = useEditorPicker(undefined, handleHide);

const showPicker = () => {
  filterUsers('');
  openPicker();
};

defineExpose({
  showPicker,
  hidePicker,
});
</script>

<template>
  <ElSelect
    v-show="isPickerVisible"
    ref="select"
    :placeholder="$t('enhancedTopic.mentionWho')"
    :filter-method="filterUsers"
    :loading="isSearching && matchingUsers.length === 0"
    :aria-busy="isSearching"
    popper-class="gzkp-editor-picker-popper"
    :popper-style="popperStyle"
    placement="top-start"
    :fallback-placements="[]"
    filterable
    fit-input-width
    automatic-dropdown
    default-first-option
    @focus="handleFocus"
    @change="handleSelect"
    @visible-change="handleVisibleChange"
  >
    <ElOption
      v-for="user in matchingUsers"
      :key="user.username"
      class="mention-picker-option"
      :value="user.username"
      :label="user.display_name === user.username ? user.username : `${user.display_name} (@${user.username})`"
    >
      <span class="mention-picker-avatar">
        <img
          v-if="user.avatar"
          :key="user.avatar"
          class="mention-picker-avatar-image"
          :src="user.avatar"
          alt=""
          loading="lazy"
          @error="hideBrokenAvatar"
        />
      </span>
      <span class="mention-picker-identity">
        <strong class="mention-picker-name" :title="user.display_name">{{ user.display_name }}</strong>
        <span class="mention-picker-username" :title="`@${user.username}`">@{{ user.username }}</span>
      </span>
    </ElOption>
  </ElSelect>
</template>

<style lang="scss" scoped>
.mention-picker-option {
  display: flex;
  gap: 10px;
  align-items: center;
  height: auto;
  min-height: 46px;
  padding: 6px 12px;
  line-height: 1.2;
}

.mention-picker-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
}

.mention-picker-avatar-image {
  width: 100%;
  height: 100%;
  border-radius: var(--el-border-radius-base);
  object-fit: cover;
}

.mention-picker-identity {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mention-picker-name,
.mention-picker-username {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mention-picker-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.mention-picker-username {
  font-size: 12px;
  font-weight: 400;
  color: var(--el-text-color-regular);
}
</style>
