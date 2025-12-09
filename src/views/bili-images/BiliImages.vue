<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { dayjs, ElMessage, ElMessageBox, ElTable } from 'element-plus';

import { t } from '@/i18n';
import { clearImgHistory, deleteImgHistory, getAllImgHistory } from '@/utils/bili-img-store';

import type { BiliImgHistoryItem } from '@/types';

const imgHistoryList = ref<BiliImgHistoryItem[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);

const total = computed(() => {
  return imgHistoryList.value.length;
});

const currentPageData = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value;
  return imgHistoryList.value.slice(startIndex, startIndex + pageSize.value);
});

const previewImgList = computed(() => {
  return currentPageData.value.map((item) => item.url);
});

onMounted(() => {
  getImgList();
});

const getImgList = async () => {
  imgHistoryList.value = await getAllImgHistory();
};

const getImgSize = (size: number) => {
  let imgSize = (size * 1000) / 1024; // 上传至 BiliBili 图床时，记录的图片 size 值为图片字节数除以 1000

  if (imgSize < 1024) {
    return imgSize.toFixed(2) + ' KB';
  }

  imgSize = imgSize / 1024;

  return imgSize.toFixed(2) + ' MB';
};

const formatDate = (timestamp: number) => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
};

const copyImgUrl = async ({ url }: BiliImgHistoryItem) => {
  await navigator.clipboard.writeText(url);
  ElMessage.success(t('common.copySuccessfully'));
};

const copyImgMarkdown = async ({ name, url }: BiliImgHistoryItem) => {
  await navigator.clipboard.writeText(`![${name}](${url})`);
  ElMessage.success(t('common.copySuccessfully'));
};

const deleteImg = async (img: BiliImgHistoryItem) => {
  await deleteImgHistory([img.id]);
  await getImgList();
  imgTable.value?.toggleRowSelection(img, false);
  ElMessage.success(t('common.deleteSuccessfully'));
};

const deleteAllImg = async () => {
  try {
    await ElMessageBox.confirm(t('biliImages.confirmDeleteAllImgHistory'), t('common.warning'), {
      type: 'warning',
      autofocus: false,
      closeOnClickModal: false,
    });

    await clearImgHistory();
    await getImgList();
    clearImgSelection();
    ElMessage.success(t('common.deleteSuccessfully'));
  } catch {
    ElMessage(t('common.canceled'));
  }
};

const imgTable = ref<InstanceType<typeof ElTable> | null>(null);

const clearImgSelection = () => {
  imgTable.value?.clearSelection();
};

const deleteSelectedImg = async () => {
  const selectedImgHistory: BiliImgHistoryItem[] = imgTable.value?.getSelectionRows();

  if (!selectedImgHistory.length) {
    ElMessage.warning(t('biliImages.plzSelectAtLeastOneImgHistory'));
    return;
  }

  try {
    await ElMessageBox.confirm(t('biliImages.confirmDeleteSelectedImgHistory'), t('common.warning'), {
      type: 'warning',
      autofocus: false,
      closeOnClickModal: false,
    });

    const selectedImgIds = selectedImgHistory.map((item) => item.id);
    await deleteImgHistory(selectedImgIds);
    await getImgList();
    clearImgSelection();
    ElMessage.success(t('common.deleteSuccessfully'));
  } catch {
    ElMessage(t('common.canceled'));
  }
};
</script>

<template>
  <ElAlert class="delete-alert" :title="$t('biliImages.deleteImgTip')" type="warning" :closable="false" show-icon />
  <ElButton type="primary" @click="clearImgSelection">{{ $t('common.clearSelections') }}</ElButton>
  <ElButton type="danger" @click="deleteSelectedImg">{{ $t('common.deleteInBatches') }}</ElButton>
  <ElButton class="float-right" type="danger" @click="deleteAllImg">{{ $t('common.deleteAll') }}</ElButton>
  <ElTable ref="imgTable" class="img-table mb mt" :data="currentPageData" row-key="id" max-height="630">
    <ElTableColumn type="selection" width="50" reserve-selection />
    <ElTableColumn prop="name" :label="$t('biliImages.fileName')" />
    <ElTableColumn :label="$t('biliImages.preview')">
      <template #default="scope">
        <ElImage
          class="preview-img"
          :src="`${scope.row.url}@40w_40h_1e_1c.webp`"
          :initial-index="scope.$index"
          :preview-src-list="previewImgList"
          hide-on-click-modal
          preview-teleported
        />
      </template>
    </ElTableColumn>
    <ElTableColumn :label="$t('biliImages.size')">
      <template #default="scope">{{ getImgSize(scope.row.size) }}</template>
    </ElTableColumn>
    <ElTableColumn :label="$t('biliImages.resolution')">
      <template #default="scope">{{ scope.row.width }} x {{ scope.row.height }}</template>
    </ElTableColumn>
    <ElTableColumn :label="$t('biliImages.uploadDate')">
      <template #default="scope">{{ formatDate(scope.row.date) }}</template>
    </ElTableColumn>
    <ElTableColumn :label="$t('biliImages.operations')" width="450">
      <template #default="scope">
        <ElButton type="primary" plain @click="copyImgUrl(scope.row)">
          {{ $t('biliImages.copyImage') }}
        </ElButton>
        <ElButton type="primary" plain @click="copyImgMarkdown(scope.row)">
          {{ $t('biliImages.copyMarkdown') }}
        </ElButton>
        <ElPopconfirm :title="$t('biliImages.confirmDeleteImgHistory')" :width="215" @confirm="deleteImg(scope.row)">
          <template #reference>
            <ElButton type="danger">{{ $t('common.delete') }}</ElButton>
          </template>
        </ElPopconfirm>
      </template>
    </ElTableColumn>
  </ElTable>
  <ElPagination
    v-model:current-page="currentPage"
    v-model:page-size="pageSize"
    layout="prev, pager, next, sizes, total"
    :page-sizes="[10, 20, 50, 100]"
    :total="total"
  />
</template>

<style lang="scss" scoped>
.delete-alert {
  margin-bottom: 1rem;
}

.preview-img {
  width: 40px;
  height: 40px;
}

.img-table {
  :deep(.el-table__cell) {
    padding: 6px 0;
  }
}
</style>
