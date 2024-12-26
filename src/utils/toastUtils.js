import { toast } from "react-toastify";

// Success toast
export const showSuccessToast = (message) => {
    toast.success(message, {
      autoClose: 2000, // Zatvara se nakon 2 sekunde
      position: "top-center", // Gde se pojavljuje
    });
  };

  // Error toast
export const showErrorToast = (message) => {
    toast.error(message, {
      autoClose: 2000,
      position: "top-center",
    });
  };
  
  // Info toast
  export const showInfoToast = (message) => {
    toast.info(message, {
      autoClose: 2000,
      position: "top-center",
    });
  };
  // Warning toast
  export const showWarningToast = (message) => {
    toast.warn(message, {
      autoClose: 2000,
      position: "top-right",
    });
  };