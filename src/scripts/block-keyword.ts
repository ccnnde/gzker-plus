import { ElMessage, ElMessageBox } from 'element-plus';

import { t } from '@/i18n';
import { getStorage, setStorage } from '@/utils';
import { BLOCK_KEYWORD_MAX } from '@/constants';

export const getKeywordList = (keywords: string) => {
  return keywords
    .split('\n')
    .map((k) => k.trim())
    .filter((k) => k);
};

export const handleBlockKeyword = async (keyword: string) => {
  try {
    let selectedKeyword = keyword;

    if (!selectedKeyword) {
      const selection = window.getSelection();
      selectedKeyword = selection?.toString().trim() || '';
    }

    selectedKeyword = selectedKeyword.replace(/\s+/g, ' ').trim();

    if (!selectedKeyword) {
      ElMessage.error(t('keywordBlock.emptyText'));
      return;
    }

    if (selectedKeyword.length > BLOCK_KEYWORD_MAX) {
      ElMessage.error(t('keywordBlock.tooLong', { max: BLOCK_KEYWORD_MAX }));
      return;
    }

    const { options } = await getStorage();
    const existingKeywords = getKeywordList(options.topicKeywordBlock.keywords);

    if (existingKeywords.includes(selectedKeyword)) {
      ElMessage.error(t('keywordBlock.alreadyExists'));
      return;
    }

    await ElMessageBox.confirm(t('keywordBlock.confirmMessage', { keyword: selectedKeyword }), t('common.warning'), {
      type: 'warning',
      autofocus: false,
    });

    let newKeywords: string;

    if (existingKeywords.length > 0) {
      newKeywords = `${options.topicKeywordBlock.keywords}\n${selectedKeyword}`;
    } else {
      newKeywords = selectedKeyword;
    }

    options.topicKeywordBlock.keywords = newKeywords;
    await setStorage({ options });
    ElMessage.success(t('keywordBlock.addSuccess'));
  } catch (err) {
    if (err === 'cancel') {
      ElMessage.info(t('common.canceled'));
    } else {
      ElMessage.error(t('keywordBlock.addFailed'));
      console.error(err);
    }
  }
};
