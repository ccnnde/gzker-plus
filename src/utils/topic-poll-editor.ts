import { t } from '@/i18n';

import type { TopicPollDraft } from '@/types';

const DAY_SECONDS = 86400;

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 20;
export const MAX_POLL_OPTION_LENGTH = 100;
export const MAX_POLL_QUESTION_LENGTH = 160;
export const MIN_POLL_DURATION_MS = 60 * 1000;
export const MAX_POLL_DURATION_MS = 30 * DAY_SECONDS * 1000;

export const createPollDraft = (): TopicPollDraft => {
  const deadline = new Date(Date.now() + 3 * DAY_SECONDS * 1000);
  const localTime = deadline.getTime() - deadline.getTimezoneOffset() * 60000;

  return {
    enabled: true,
    question: '',
    options: ['', ''],
    maxChoices: 1,
    public: false,
    revote: true,
    results: 'always',
    deadline: new Date(localTime).toISOString().slice(0, 16),
  };
};

export const getPollErrors = (draft: TopicPollDraft, now: number = Date.now()): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!draft.question.trim()) {
    errors.question = t('enhancedTopic.pollEditor.missingQuestion');
  } else if (draft.question.length > MAX_POLL_QUESTION_LENGTH) {
    errors.question = t('enhancedTopic.pollEditor.questionTooLong');
  }

  if (draft.options.length < MIN_POLL_OPTIONS || draft.options.length > MAX_POLL_OPTIONS) {
    errors.options = t('enhancedTopic.pollEditor.invalidOptions');
  }

  const normalized = draft.options.map((option) => {
    return option.trim().normalize('NFKC').toLowerCase();
  });

  draft.options.forEach((option, index) => {
    const value = option.trim();
    const duplicated = normalized.some((candidate, candidateIndex) => {
      return candidateIndex !== index && candidate === normalized[index];
    });

    if (!value) {
      errors[`options.${index}`] = t('enhancedTopic.pollEditor.missingOption');
    } else if (value.length > MAX_POLL_OPTION_LENGTH) {
      errors[`options.${index}`] = t('enhancedTopic.pollEditor.optionTooLong');
    } else if (duplicated) {
      errors[`options.${index}`] = t('enhancedTopic.pollEditor.duplicateOptions');
    }
  });

  if (!Number.isInteger(draft.maxChoices) || draft.maxChoices < 1 || draft.maxChoices > draft.options.length) {
    errors.maxChoices = t('enhancedTopic.pollEditor.invalidMaxChoices');
  }

  const closesAt = Math.floor(new Date(draft.deadline).getTime() / 1000);
  const nowSeconds = now / 1000;

  if (
    !Number.isFinite(closesAt) ||
    closesAt < nowSeconds + MIN_POLL_DURATION_MS / 1000 ||
    closesAt > nowSeconds + MAX_POLL_DURATION_MS / 1000
  ) {
    errors.deadline = t('enhancedTopic.pollEditor.invalidDeadline');
  }

  if (!['always', 'after_vote', 'after_close'].includes(draft.results)) {
    errors.results = t('enhancedTopic.pollEditor.invalidResults');
  }

  return errors;
};

export const serializePoll = (draft: TopicPollDraft): string => {
  const options = draft.options.map((option) => {
    return option.trim();
  });

  return JSON.stringify({
    question: draft.question.trim(),
    options,
    max_choices: draft.maxChoices,
    public: draft.public,
    revote: draft.revote,
    results: draft.results,
    closes_at: Math.floor(new Date(draft.deadline).getTime() / 1000),
  });
};
