import { t } from '@/i18n';
import { getXsrfToken } from '@/utils';

import type { TopicPoll, TopicPollVote, TopicPollVoterPage, TopicPollVoterQuery } from '@/types';

const API_POLL = '/api/polls/';

interface PollResponse<T> {
  ok?: boolean;
  data?: T | null;
  message?: string;
}

const requestPoll = async <T>(path: string, signal: AbortSignal, body?: object): Promise<T> => {
  const headers = new Headers({ Accept: 'application/json' });
  const init: RequestInit = {
    headers,
    signal,
    credentials: 'same-origin',
    cache: 'no-store',
  };

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    headers.set('X-XSRFToken', getXsrfToken());
    init.method = 'POST';
    init.body = JSON.stringify(body);
  }

  const response = await fetch(API_POLL + path, init);
  const result = (await response.json().catch(() => {
    return undefined;
  })) as PollResponse<T> | undefined;

  if (!response.ok || result?.ok !== true || result.data === undefined || result.data === null) {
    const message = typeof result?.message === 'string' ? result.message : '';
    throw new Error(message || t('enhancedTopic.poll.requestFailed'));
  }

  return result.data;
};

export const getTopicPoll = (pollId: string, signal: AbortSignal): Promise<TopicPoll> => {
  return requestPoll<TopicPoll>(pollId, signal);
};

export const voteInTopicPoll = (pollId: string, vote: TopicPollVote, signal: AbortSignal): Promise<TopicPoll> => {
  return requestPoll<TopicPoll>(`${pollId}/vote`, signal, vote);
};

export const closeTopicPoll = (pollId: string, signal: AbortSignal): Promise<TopicPoll> => {
  return requestPoll<TopicPoll>(`${pollId}/close`, signal, { confirm: true });
};

export const getTopicPollVoters = (
  pollId: string,
  query: TopicPollVoterQuery,
  signal: AbortSignal,
): Promise<TopicPollVoterPage> => {
  const params = new URLSearchParams({
    option: String(query.option),
    after: String(query.after),
  });

  return requestPoll<TopicPollVoterPage>(`${pollId}/voters?${params.toString()}`, signal);
};
