import type { EditHistoryItem, TopicForm } from '@/types';

const editHistoryIdRegExp = /-uid:(?<uid>[a-zA-Z]\w{2,})(-tid:(?<tid>\d+))?(-rid:(?<rid>\d+))?(-time:(?<time>\d+))/;

export const enum EditHistoryType {
  TopicCreate = 'gzk-edit-history-topic-create',
  TopicModify = 'gzk-edit-history-topic-modify',
  ReplyCreate = 'gzk-edit-history-reply-create',
  ReplyModify = 'gzk-edit-history-reply-modify',
}

export const getTopicCreateHistoryId = (uid: string) => {
  const timestamp = Date.now();
  return `${EditHistoryType.TopicCreate}-uid:${uid}-time:${timestamp}`;
};

export const getTopicModifyHistoryId = (uid: string, topicId: string) => {
  const timestamp = Date.now();
  return `${EditHistoryType.TopicModify}-uid:${uid}-tid:${topicId}-time:${timestamp}`;
};

export const getReplyCreateHistoryId = (uid: string, topicId: string) => {
  const timestamp = Date.now();
  return `${EditHistoryType.ReplyCreate}-uid:${uid}-tid:${topicId}-time:${timestamp}`;
};

export const getReplyModifyHistoryId = (uid: string, topicId: string, replyId: string) => {
  const timestamp = Date.now();
  return `${EditHistoryType.ReplyModify}-uid:${uid}-tid:${topicId}-rid:${replyId}-time:${timestamp}`;
};

export const saveEditHistory = (id: string, data: Partial<TopicForm>) => {
  const match = id.match(editHistoryIdRegExp);

  if (!match?.groups) {
    return;
  }

  const { uid, tid, rid, time } = match.groups;
  const createTimestamp = Number(time);
  const updateTimestamp = Date.now();

  const editHistory: EditHistoryItem = {
    id,
    uid,
    topicId: tid,
    replyId: rid,
    createTime: new Date(createTimestamp).toLocaleString(),
    createTimestamp,
    updateTime: new Date(updateTimestamp).toLocaleString(),
    updateTimestamp,
    ...data,
  };

  localStorage.setItem(id, JSON.stringify(editHistory));
};

export const getEditHistoryKeysByType = (type: EditHistoryType) => {
  return Object.keys(localStorage).filter((key) => key.startsWith(type));
};

export const getAllEditHistoryByType = (type: EditHistoryType): EditHistoryItem[] => {
  const editHistoryItems: EditHistoryItem[] = [];
  const editHistoryKeys = getEditHistoryKeysByType(type);

  editHistoryKeys.forEach((key) => {
    const editHistory = localStorage.getItem(key);

    if (editHistory) {
      editHistoryItems.push(JSON.parse(editHistory));
    }
  });

  return editHistoryItems.sort((prev, next) => next.updateTimestamp - prev.updateTimestamp);
};

export const deleteAllEditHistoryByType = (type: EditHistoryType) => {
  const editHistoryKeys = getEditHistoryKeysByType(type);
  editHistoryKeys.forEach((key) => localStorage.removeItem(key));
};
