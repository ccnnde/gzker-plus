import type { InjectionKey } from 'vue';

export const UPDATE_SCROLLBAR_INJECTION_KEY: InjectionKey<() => void> = Symbol('updateScrollbar');

export const WRITE_REPLY_INJECTION_KEY: InjectionKey<(content?: string) => void> = Symbol('writeReply');
