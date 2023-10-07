import type { InjectionKey } from 'vue';

export const UPDATE_SCROLLBAR_INJECTION_KEY: InjectionKey<() => void> = Symbol('updateScrollbar');
