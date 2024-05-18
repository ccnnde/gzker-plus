<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus';

import { useRequest } from '@/composables/request';
import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import { getStorage, getTopicUrl, setStorage } from '@/utils';

import type { BlockedTopic } from '@/types';

const storage = useStorageStore();
const { handleRequest } = useRequest();

const handleTopicUnblock = async ({ id, title }: BlockedTopic) => {
  try {
    await ElMessageBox.confirm(t('enhancedTopic.confirmUnblockTopic', { title }), t('common.warning'), {
      type: 'warning',
      autofocus: false,
    });

    handleRequest(async () => {
      const { blockedTopicList } = await getStorage();
      const topicIndex = blockedTopicList.findIndex((item) => item.id === id);

      if (topicIndex !== -1) {
        blockedTopicList.splice(topicIndex, 1);
      }

      if (storage.settings) {
        storage.settings.blockedTopicList = blockedTopicList;
      }

      await setStorage({
        blockedTopicList,
      });

      ElMessage.success(t('enhancedTopic.unblockTopicSuccessful'));
    });
  } catch {
    ElMessage(t('common.canceled'));
  }
};
</script>

<template>
  <ol>
    <li v-for="item in storage.blockedTopicList" :key="item.id" class="blocked-topic">
      <ElButton type="info" text @click="handleTopicUnblock(item)">
        <un-i-mdi-close />
      </ElButton>
      <ElLink type="primary" :href="getTopicUrl(item.id)" :underline="false" target="_blank">{{ item.title }} </ElLink>
    </li>
  </ol>
  <ElEmpty v-if="!storage.blockedTopicList.length" />
</template>

<style lang="scss" scoped>
.blocked-topic {
  display: flex;
  align-items: flex-start;

  button {
    height: auto;
    padding: 5px;
    margin-right: 5px;
  }
}
</style>
