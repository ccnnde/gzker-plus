import type { InjectionKey } from 'vue';
import type { UserReplyItem } from '@/types';

export const UPDATE_SCROLLBAR_INJECTION_KEY: InjectionKey<() => void> = Symbol('updateScrollbar');

export const ADD_REPLY_INJECTION_KEY: InjectionKey<(content?: string) => void> = Symbol('addReply');

export const EDIT_REPLY_INJECTION_KEY: InjectionKey<(reply: UserReplyItem) => void> = Symbol('editReply');
