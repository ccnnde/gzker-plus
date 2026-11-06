import type { InjectionKey } from 'vue';
import type { MentionRepliesController, ReplyHoverController, SearchFiltersController, UserReplyItem } from '@/types';

export const UPDATE_SCROLLBAR_INJECTION_KEY: InjectionKey<() => void> = Symbol('updateScrollbar');

export const ADD_REPLY_INJECTION_KEY: InjectionKey<(reply?: UserReplyItem) => void> = Symbol('addReply');

export const EDIT_REPLY_INJECTION_KEY: InjectionKey<(reply: UserReplyItem) => void> = Symbol('editReply');

export const MENTION_REPLIES_INJECTION_KEY: InjectionKey<MentionRepliesController> = Symbol('mentionReplies');

export const REPLY_HOVER_INJECTION_KEY: InjectionKey<ReplyHoverController> = Symbol('replyHover');

export const SEARCH_FILTER_INJECTION_KEY: InjectionKey<SearchFiltersController> = Symbol('searchFilter');
