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
  try {
    const results = await searchMentionUsers(term || GZK_AI_AGENT_UID, controller.signal);

    if (controller.signal.aborted) {
      return;
    }

    remoteUsers.value = term ? results : results.filter(isAiAgent);
  } catch {
    // Local suggestions remain available when the search fails.
  }
}, 300);

const isAiAgent = (user: MentionUser) => {
  return normalize(user.username) === GZK_AI_AGENT_UID;
};

const filterUsers = (term: string) => {
  query.value = term.trim();
  remoteUsers.value = [];
  searchController?.abort();
  searchController = new AbortController();
  searchUsers(query.value, searchController);
};

const stopSearch = () => {
  searchController?.abort();
  searchUsers.cancel();
};

onBeforeUnmount(stopSearch);

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
  showPicker: openPicker,
  handleFocus,
  handleVisibleChange,
} = useEditorPicker(handleSelect, handleHide);

const showPicker = () => {
  filterUsers('');
  openPicker();
};

defineExpose({
  showPicker,
});
</script>

<template>
  <ElSelect
    v-show="isPickerVisible"
    ref="select"
    :placeholder="$t('enhancedTopic.mentionWho')"
    :filter-method="filterUsers"
    popper-class="gzkp-editor-picker-popper"
    filterable
    allow-create
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
      <ElAvatar class="mention-picker-avatar" :size="28" shape="square" :src="user.avatar" alt="">
        {{ user.username.slice(0, 1).toUpperCase() }}
      </ElAvatar>
      <span class="mention-picker-identity">
        <strong class="mention-picker-name">{{ user.display_name }}</strong>
        <span class="mention-picker-username">@{{ user.username }}</span>
      </span>
    </ElOption>
  </ElSelect>
</template>

<style lang="scss" scoped>
.mention-picker-option {
  display: flex;
  gap: 9px;
  align-items: center;
  height: auto;
  min-height: 44px;
  padding: 6px 11px;
  line-height: 1.2;
}

.mention-picker-avatar {
  flex-shrink: 0;
}

.mention-picker-identity {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mention-picker-name,
.mention-picker-username {
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-picker-name {
  font-size: 14px;
}

.mention-picker-username {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
