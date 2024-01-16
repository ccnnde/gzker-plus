import { ref } from 'vue';

export const useDialog = () => {
  const dialogVisible = ref(false);

  const openDialog = () => {
    dialogVisible.value = true;
  };

  const closeDialog = () => {
    dialogVisible.value = false;
  };

  return {
    dialogVisible,
    openDialog,
    closeDialog,
  };
};
