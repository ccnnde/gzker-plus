import { ref } from 'vue';
import { ElMessage } from 'element-plus';

export const useRequest = () => {
  const isLoading = ref(false);
  const errorOccurred = ref(false);

  const handleRequest = async (callback: () => Promise<void>) => {
    isLoading.value = true;

    try {
      await callback();
    } catch (err) {
      errorOccurred.value = true;
      ElMessage.error((err as Error).message);
      console.error(err);
    } finally {
      isLoading.value = false;
    }
  };

  const resetRequestState = () => {
    isLoading.value = false;
    errorOccurred.value = false;
  };

  return {
    isLoading,
    errorOccurred,
    handleRequest,
    resetRequestState,
  };
};
