<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import { useRequest } from '@/composables/request';
import { t } from '@/i18n';
import { getUsage } from '@/api/sm-img';
import { getUploadCapability, requestPermission } from '@/utils/permissions';
import { ImageHostingPlatform, OptionsRouteNames } from '@/constants';

import type { OptionsKey } from '@/constants';
import type { SettingProps, SMUsage } from '@/types';

const props = defineProps<SettingProps<OptionsKey.SmApiKey>>();

const { isLoading, handleRequest } = useRequest();
const usage = ref<SMUsage>();

const storageInfo = computed(() => {
  if (!usage.value) {
    return '-';
  }

  const usedMb = usage.value.storage_usage_mb;
  const limitGb = (parseFloat(usage.value.storage_usage_limit_mb) / 1024).toFixed(2);

  return `${usedMb} MB / ${limitGb} GB`;
});

const checkApiKey = async () => {
  const { apiKey } = props.settings;

  if (!apiKey) {
    ElMessage.error(t('basicSetting.smApiKey.plzEnterApiKey'));
    return;
  }

  try {
    const capability = getUploadCapability(ImageHostingPlatform.Smms);
    const granted = await requestPermission(capability);

    if (!granted) {
      ElMessage.warning(t('basicSetting.imageHosting.permissionDenied'));
      return;
    }
  } catch (error) {
    console.error(error);
    ElMessage.error(t('basicSetting.imageHosting.permissionRequestFailed'));
    return;
  }

  handleRequest(async () => {
    usage.value = await getUsage(apiKey);
  });
};

const openSMPicturePage = () => {
  window.open('https://s.ee/user/files/');
};

const clearUsage = () => {
  usage.value = undefined;
};

watch(() => props.settings.apiKey, clearUsage);
</script>

<template>
  <div class="sm-api-key-container">
    <div class="sm-api-key-content">
      <Transition name="sm-api-key-status">
        <section v-if="usage" class="sm-api-key-status" role="status" aria-live="polite" aria-atomic="true">
          <div class="sm-api-key-status-main">
            <span class="sm-api-key-status-icon" aria-hidden="true">
              <un-i-mdi-check class="sm-api-key-status-check" />
            </span>
            <strong>{{ $t('basicSetting.smApiKey.apiAvailable') }}</strong>
          </div>
          <div class="sm-api-key-usage">
            <span class="sm-api-key-usage-item">
              <span>{{ $t('basicSetting.smApiKey.usage.fileCount') }}</span>
              <strong>
                {{ $t('basicSetting.smApiKey.usage.fileCountValue', { count: usage.file_count }) }}
              </strong>
            </span>
            <span class="sm-api-key-usage-divider" aria-hidden="true"></span>
            <span class="sm-api-key-usage-item">
              <span>{{ $t('basicSetting.smApiKey.usage.storage') }}</span>
              <strong>{{ storageInfo }}</strong>
            </span>
          </div>
          <button class="sm-api-key-status-close" type="button" :aria-label="$t('common.close')" @click="clearUsage">
            <un-i-mdi-close class="sm-api-key-status-close-icon" aria-hidden="true" />
          </button>
        </section>
      </Transition>
      <div class="sm-api-key-actions">
        <ElInput
          v-model="settings.apiKey"
          class="sm-api-key-input"
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
        <div class="sm-api-key-buttons">
          <ElButton type="primary" :loading="isLoading" @click="checkApiKey">
            {{ $t('basicSetting.smApiKey.checkApi') }}
          </ElButton>
          <ElButton type="primary" @click="openSMPicturePage">
            {{ $t('basicSetting.smApiKey.managePicture') }}
          </ElButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sm-api-key-container {
  container-type: inline-size;
}

.sm-api-key-content {
  display: inline-flex;
  flex-direction: column;
  max-width: 100%;
  vertical-align: top;
}

.sm-api-key-status {
  position: relative;
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-height: 60px;
  padding: 14px;
  margin-bottom: 16px;
  color: var(--el-text-color-primary);
  background-color: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  contain: inline-size;
}

.sm-api-key-status-main {
  display: flex;
  gap: 10px;
  align-items: center;
  padding-right: 36px;
  white-space: nowrap;

  > strong {
    font-size: var(--el-font-size-base);
    font-weight: 600;
    line-height: 20px;
    letter-spacing: 0.01em;
  }
}

.sm-api-key-status-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--el-color-white);
  background-color: var(--el-color-primary);
  border-radius: 50%;
}

.sm-api-key-status-check {
  width: 14px;
  height: 14px;
}

.sm-api-key-usage {
  display: grid;
  grid-template-columns: max-content 1px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-width: 0;
  padding-left: 32px;
  margin-top: 12px;
  font-size: var(--el-font-size-small);
  line-height: 18px;
}

.sm-api-key-usage-item {
  display: inline-flex;
  gap: 6px;
  min-width: 0;
  color: var(--el-text-color-secondary);
  white-space: nowrap;

  > strong {
    min-width: 0;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
  }

  &:last-child {
    flex-wrap: wrap;
    white-space: normal;
  }
}

.sm-api-key-usage-divider {
  width: 1px;
  height: 16px;
  background-color: var(--el-border-color-light);
}

.sm-api-key-status-close {
  position: absolute;
  top: 10px;
  right: 8px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background-color: var(--el-fill-color-lighter);
  border: 0;
  border-radius: var(--el-border-radius-base);

  &:hover {
    color: var(--el-text-color-primary);
    background-color: var(--el-fill-color);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }
}

.sm-api-key-status-close-icon {
  width: 16px;
  height: 16px;
}

.sm-api-key-status-enter-active,
.sm-api-key-status-leave-active {
  overflow: hidden;
  transition: opacity 160ms ease, transform 160ms ease;
}

.sm-api-key-status-enter-from,
.sm-api-key-status-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.sm-api-key-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  align-items: center;
}

.sm-api-key-buttons {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 12px;
  max-width: 100%;

  > :deep(.el-button) {
    max-width: 100%;
    margin-left: 0;
  }
}

.sm-api-key-input {
  flex: 0 1 19em;
  width: 19em;
  min-width: 0;
  max-width: 100%;
}

@container (width < 320px) {
  .sm-api-key-usage {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
  }

  .sm-api-key-usage-item:last-child {
    flex-wrap: nowrap;
    white-space: nowrap;
  }

  .sm-api-key-usage-divider {
    display: none;
  }
}

@container (width < 400px) {
  .sm-api-key-content {
    display: flex;
    width: 100%;
  }

  .sm-api-key-actions {
    flex-wrap: wrap;
  }

  .sm-api-key-input,
  .sm-api-key-buttons {
    flex: 1 1 100%;
    width: 100%;
  }

  .sm-api-key-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    > :deep(.el-button) {
      width: 100%;
    }
  }
}

@container (width < 300px) {
  .sm-api-key-status-main {
    white-space: normal;
  }

  .sm-api-key-usage-item:last-child {
    flex-wrap: wrap;
    white-space: normal;
  }
}

@container (width < 188px) {
  .sm-api-key-buttons {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
