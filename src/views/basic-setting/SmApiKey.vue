<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { useDialog } from '@/composables/dialog';
import { useRequest } from '@/composables/request';
import { t } from '@/i18n';
import { getUserProfile } from '@/api/sm-img';
import { OptionsRouteNames } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps, SMUserProfile } from '@/types';

const props = defineProps<SettingProps<OptionsKey.SmApiKey>>();

const { isLoading, handleRequest } = useRequest();
const { dialogVisible, openDialog } = useDialog();
const userProfile = ref<SMUserProfile>();

const userType = computed(() => {
  return userProfile.value?.role === 'VIP'
    ? t('basicSetting.smApiKey.userProfile.vipUser')
    : t('basicSetting.smApiKey.userProfile.regularUser');
});

const emailStatus = computed(() => {
  return userProfile.value?.email_verified
    ? t('basicSetting.smApiKey.userProfile.verified')
    : t('basicSetting.smApiKey.userProfile.notVerified');
});

const checkApiKey = () => {
  const { apiKey } = props.settings;

  if (!apiKey) {
    ElMessage.error(t('basicSetting.smApiKey.plzEnterApiKey'));
    return;
  }

  handleRequest(async () => {
    userProfile.value = await getUserProfile(apiKey);
    ElMessage.success(t('basicSetting.smApiKey.apiAvailable'));
    openDialog();
  });
};

const openSMPicturePage = () => {
  window.open('https://smms.app/home/picture');
};

const handleDialogClosed = () => {
  userProfile.value = undefined;
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
    class="user-profile-dialog"
    :title="$t('basicSetting.smApiKey.userProfile.title')"
    width="400px"
    @closed="handleDialogClosed"
  >
    <ElDescriptions v-if="userProfile" :column="1" border>
      <ElDescriptionsItem :label="$t('basicSetting.smApiKey.userProfile.name')">
        {{ userProfile.username }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('basicSetting.smApiKey.userProfile.group')">
        {{ userType }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('basicSetting.smApiKey.userProfile.expireDate')">
        {{ userProfile.group_expire || '-' }}
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('basicSetting.smApiKey.userProfile.email')">
        {{ userProfile.email }}
        ({{ emailStatus }})
      </ElDescriptionsItem>
      <ElDescriptionsItem :label="$t('basicSetting.smApiKey.userProfile.diskSpace')">
        {{ userProfile.disk_usage }} / {{ userProfile.disk_limit }}
      </ElDescriptionsItem>
    </ElDescriptions>
  </ElDialog>
</template>

<style lang="scss">
.user-profile-dialog {
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
