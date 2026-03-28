<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { useDialog } from '@/composables/dialog';
import { useRequest } from '@/composables/request';
import { t } from '@/i18n';
import { getUsage } from '@/api/sm-img';
import { OptionsRouteNames } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps, SMUsage } from '@/types';

const props = defineProps<SettingProps<OptionsKey.SmApiKey>>();

const { isLoading, handleRequest } = useRequest();
const { dialogVisible, openDialog } = useDialog();
const usage = ref<SMUsage>();

const storageInfo = computed(() => {
  if (!usage.value) {
    return '-';
  }

  const usedMb = usage.value.storage_usage_mb;
  const limitGb = (parseFloat(usage.value.storage_usage_limit_mb) / 1024).toFixed(2);

  return `${usedMb} MB / ${limitGb} GB`;
});

const checkApiKey = () => {
  const { apiKey } = props.settings;

  if (!apiKey) {
    ElMessage.error(t('basicSetting.smApiKey.plzEnterApiKey'));
    return;
  }

  handleRequest(async () => {
    usage.value = await getUsage(apiKey);
    ElMessage.success(t('basicSetting.smApiKey.apiAvailable'));
    openDialog();
  });
};

const openSMPicturePage = () => {
  window.open('https://s.ee/user/files/');
};

const handleDialogClosed = () => {
  usage.value = undefined;
};
</script>

<template>
  <div>
    <ElInput
      v-model="settings.apiKey"
      class="api-key-input"
      type="password"
      :placeholder="$t('basicSetting.smApiKey.plzEnterApiKey')"
      show-password
      clearable
    >
      <template #append>
        <ElButton @click="$router.push({ name: OptionsRouteNames.ImageHosting })">
          {{ $t('basicSetting.smApiKey.explanation') }}
        </ElButton>
      </template>
    </ElInput>
    <ElButton type="primary" :loading="isLoading" @click="checkApiKey">
      {{ $t('basicSetting.smApiKey.checkApi') }}
    </ElButton>
    <ElButton type="primary" @click="openSMPicturePage">
      {{ $t('basicSetting.smApiKey.managePicture') }}
    </ElButton>
  </div>
  <ElDialog
    v-model="dialogVisible"
    class="usage-dialog"
    :title="$t('basicSetting.smApiKey.usage.title')"
    width="400px"
    @closed="handleDialogClosed"
  >
    <ElDescriptions v-if="usage" :column="1" border>
      <ElDescriptionsItem :label="$t('basicSetting.smApiKey.usage.fileCount')">
        {{ usage.file_count }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('basicSetting.smApiKey.usage.storage')">
        {{ storageInfo }}
      </ElDescriptionsItem>
    </ElDescriptions>
  </ElDialog>
</template>

<style lang="scss">
.usage-dialog {
  .el-dialog__body {
    padding-top: 0;
    padding-bottom: 15px;
  }
}
</style>

<style lang="scss" scoped>
.api-key-input {
  width: 19em;
  margin-right: 12px;
}
</style>
