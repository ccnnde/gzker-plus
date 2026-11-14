import type { InjectionKey, Ref } from 'vue';
import type {
  BountyAcceptanceController,
  MentionRepliesController,
  ReplyHoverController,
  SearchFiltersController,
  UserReplyItem,
} from '@/types';

export const UPDATE_SCROLLBAR_INJECTION_KEY: InjectionKey<() => void> = Symbol('updateScrollbar');

export const ADD_REPLY_INJECTION_KEY: InjectionKey<(reply?: UserReplyItem) => void> = Symbol('addReply');

export const EDIT_REPLY_INJECTION_KEY: InjectionKey<(reply: UserReplyItem) => void> = Symbol('editReply');

export const BOUNTY_ACCEPTANCE_INJECTION_KEY: InjectionKey<BountyAcceptanceController> = Symbol('bountyAcceptance');

export const MENTION_REPLIES_INJECTION_KEY: InjectionKey<MentionRepliesController> = Symbol('mentionReplies');

export const REPLY_HOVER_INJECTION_KEY: InjectionKey<ReplyHoverController> = Symbol('replyHover');

export const REPLY_FOCUS_ID_INJECTION_KEY: InjectionKey<Readonly<Ref<string | undefined>>> = Symbol('replyFocusId');

export const SEARCH_FILTER_INJECTION_KEY: InjectionKey<SearchFiltersController> = Symbol('searchFilter');
