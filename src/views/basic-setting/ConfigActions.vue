<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import { useStorageStore } from '@/stores/storage';
import { t } from '@/i18n';
import {
  applyExtConfig,
  createExtConfig,
  downloadExtConfig,
  parseExtConfig,
  resetExtOptions,
} from '@/utils/ext-config';

import type { ExtConfig } from '@/types';

type ConfigAction = 'export' | 'import' | 'reset';

const storage = useStorageStore();
const fileInput = ref<HTMLInputElement | null>(null);
const pendingAction = ref<ConfigAction>();

const selectConfigurationFile = () => {
  fileInput.value?.click();
};

const exportConfiguration = async () => {
  pendingAction.value = 'export';

  try {
    const config = await createExtConfig();
    downloadExtConfig(config);
    ElMessage.success(t('basicSetting.configActions.exportSuccess'));
  } catch (error) {
    console.error(error);
    ElMessage.error(t('basicSetting.configActions.exportFailed'));
  } finally {
    pendingAction.value = undefined;
  }
};

const importConfiguration = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  pendingAction.value = 'import';

  try {
    let config: ExtConfig;

    try {
      config = await parseExtConfig(file);
    } catch (error) {
      console.error(error);
      ElMessage.error(t('basicSetting.configActions.invalidFile'));
      return;
    }

    try {
      await ElMessageBox.confirm(t('basicSetting.configActions.confirmImport'), t('common.warning'), {
        type: 'warning',
        autofocus: false,
        closeOnClickModal: false,
      });
    } catch {
      ElMessage(t('common.canceled'));
      return;
    }

    const settings = await applyExtConfig(config);
    storage.updateSettingsFromStorage(settings);
    ElMessage.success(t('basicSetting.configActions.importSuccess'));
  } catch (error) {
    console.error(error);
    ElMessage.error(t('basicSetting.configActions.importFailed'));
  } finally {
    pendingAction.value = undefined;
    input.value = '';
  }
};

const resetConfiguration = async () => {
  try {
    await ElMessageBox.confirm(t('basicSetting.configActions.confirmReset'), t('common.warning'), {
      type: 'warning',
      autofocus: false,
      closeOnClickModal: false,
    });
  } catch {
    ElMessage(t('common.canceled'));
    return;
  }

  pendingAction.value = 'reset';

  try {
    const settings = await resetExtOptions();
    storage.updateSettingsFromStorage(settings);
    ElMessage.success(t('basicSetting.configActions.resetSuccess'));
  } catch (error) {
    console.error(error);
    ElMessage.error(t('basicSetting.configActions.resetFailed'));
  } finally {
    pendingAction.value = undefined;
  }
};
</script>

<template>
  <div class="config-actions-content">
    <ElButton
      type="primary"
      :disabled="pendingAction !== undefined"
      :loading="pendingAction === 'export'"
      @click="exportConfiguration"
    >
      {{ $t('basicSetting.configActions.export') }}
    </ElButton>
    <ElButton
      type="primary"
      :disabled="pendingAction !== undefined"
      :loading="pendingAction === 'import'"
      @click="selectConfigurationFile"
    >
      {{ $t('basicSetting.configActions.import') }}
    </ElButton>
    <ElButton
      type="danger"
      :disabled="pendingAction !== undefined"
      :loading="pendingAction === 'reset'"
      @click="resetConfiguration"
    >
      {{ $t('basicSetting.configActions.reset') }}
    </ElButton>
    <input
      ref="fileInput"
      class="config-actions-file-input"
      type="file"
      accept=".json,application/json"
      @change="importConfiguration"
    />
  </div>
</template>

<style lang="scss" scoped>
.config-actions-content {
  display: flex;
  flex-wrap: wrap;
}

.config-actions-file-input {
  display: none;
}
</style>
