import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';

import { ReplyOrder } from '@/constants';

import type { ComputedRef, Ref } from 'vue';
import type { PageLoadContext, PageLoadRunner } from '@/types';

interface UsePageLoadSessionOptions {
  errorCallback?: (error: Error) => void;
}

interface UsePageLoadSessionResult {
  isLoading: Ref<boolean>;
  errorOccurred: Ref<boolean>;
  isReverse: ComputedRef<boolean>;
  startSession: (direction?: ReplyOrder) => void;
  runLoad: PageLoadRunner;
  retryLoad: PageLoadRunner;
  cancelLoad: () => void;
  resetSession: () => void;
}

export const usePageLoadSession = (options?: UsePageLoadSessionOptions): UsePageLoadSessionResult => {
  const isLoading = ref(false);
  const errorOccurred = ref(false);
  const direction = ref<ReplyOrder>(ReplyOrder.Asc);

  let sessionVersion = 0;
  let loadVersion = 0;
  let abortController: AbortController | undefined;

  const isReverse = computed(() => {
    return direction.value === ReplyOrder.Desc;
  });

  const cancelLoad = () => {
    loadVersion++;
    abortController?.abort();
    abortController = undefined;
    isLoading.value = false;
    errorOccurred.value = false;
  };

  const startSession = (nextDirection: ReplyOrder = ReplyOrder.Asc) => {
    sessionVersion++;
    cancelLoad();
    direction.value = nextDirection;
  };

  const resetSession = () => {
    startSession();
  };

  const runLoad: PageLoadRunner = async (callback) => {
    if (isLoading.value) {
      return false;
    }

    const currentSessionVersion = sessionVersion;
    const currentLoadVersion = ++loadVersion;
    const currentDirection = direction.value;
    const currentAbortController = new AbortController();
    abortController = currentAbortController;

    const context: PageLoadContext = {
      direction: currentDirection,
      signal: currentAbortController.signal,
      isCurrent: () => {
        return (
          currentSessionVersion === sessionVersion &&
          currentLoadVersion === loadVersion &&
          !currentAbortController.signal.aborted
        );
      },
    };

    isLoading.value = true;
    errorOccurred.value = false;

    try {
      await callback(context);
      return context.isCurrent();
    } catch (err) {
      if (!context.isCurrent()) {
        return false;
      }

      const error = err as Error;
      errorOccurred.value = true;

      if (options?.errorCallback) {
        options.errorCallback(error);
      } else {
        ElMessage.error(error.message);
      }

      console.error(error);
      return false;
    } finally {
      if (context.isCurrent()) {
        abortController = undefined;
        isLoading.value = false;
      }
    }
  };

  const retryLoad: PageLoadRunner = async (callback) => {
    errorOccurred.value = false;
    return runLoad(callback);
  };

  return {
    isLoading,
    errorOccurred,
    isReverse,
    startSession,
    runLoad,
    retryLoad,
    cancelLoad,
    resetSession,
  };
};
