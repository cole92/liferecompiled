import { toast } from "react-toastify";

const DEFAULTS = {
  autoClose: 2000,
  position: "top-center",
  pauseOnHover: false,
  pauseOnFocusLoss: false,
};

function emit(type, content, opts = {}) {
  const toastId = opts.toastId ?? opts.id;

  const baseOptions = { ...DEFAULTS, ...opts };
  delete baseOptions.id;
  delete baseOptions.toastId;

  if (toastId && toast.isActive(toastId)) {
    toast.update(toastId, {
      render: content,
      type,
      ...baseOptions,
    });
    return toastId;
  }

  const options = toastId ? { ...baseOptions, toastId } : baseOptions;

  if (type === "success") return toast.success(content, options);
  if (type === "error") return toast.error(content, options);
  if (type === "info") return toast.info(content, options);
  if (type === "warning") return toast.warn(content, options);

  return toast(content, { ...options, type });
}

export const showSuccessToast = (message, opts) =>
  emit("success", message, opts);
export const showErrorToast = (message, opts) => emit("error", message, opts);
export const showInfoToast = (message, opts) => emit("info", message, opts);
export const showWarningToast = (message, opts) =>
  emit("warning", message, opts);

export const dismissToast = (id) => toast.dismiss(id);
export const dismissAllToasts = () => toast.dismiss();
