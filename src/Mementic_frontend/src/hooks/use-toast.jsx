import { useToastContext } from "../contexts/ToastContext";

// Wrapper hook to provide consistent toast interface
export const useToast = () => {
  const { addToast } = useToastContext();

  return {
    toast: addToast,
    addToast,
  };
};
