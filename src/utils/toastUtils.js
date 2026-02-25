import { toast } from "react-toastify";

const DEFAULTS = {
  autoClose: 2000,
  position: "top-center",
  pauseOnHover: false,
  pauseOnFocusLoss: false,
};

/**
 * @helper emit
 *
 * Unified toast emitter with sane defaults and de-dupe via `toastId`.
 *
 * Why:
 * - Prevents toast spam by updating an existing toast when the same `toastId` is active.
 * - Keeps app-wide toast behavior consistent (duration, position, pause rules).
 * - Allows legacy callers to pass either `opts.toastId` or `opts.id`.
 *
 * Behavior:
 * - If `toastId` is active -> `toast.update(...)` instead of creating a new toast.
 * - Otherwise -> emits a new toast using the typed helper (`toast.success`, etc.).
 * - Removes `id` / `toastId` from base options to avoid accidental option conflicts.
 *
 * @param {"success"|"error"|"info"|"warning"|string} type - Toast type.
 * @param {any} content - Toast content (string/ReactNode).
 * @param {Object} [opts={}] - react-toastify options + optional `id` alias.
 * @returns {string|number} Toast id returned by react-toastify.
 */
function emit(type, content, opts = {}) {
  const toastId = opts.toastId ?? opts.id;

  const baseOptions = { ...DEFAULTS, ...opts };
  delete baseOptions.id;
  delete baseOptions.toastId;

  if (toastId && toast.isActive(toastId)) {
    // De-dupe: update the existing toast instead of stacking duplicates
    toast.update(toastId, {
      render: content,
      type,
      ...baseOptions,
    });
    return toastId;
  }

  const options = toastId ? { ...baseOptions, toastId } : baseOptions;

  // Prefer typed helpers for consistent styling by level
  if (type === "success") return toast.success(content, options);
  if (type === "error") return toast.error(content, options);
  if (type === "info") return toast.info(content, options);
  if (type === "warning") return toast.warn(content, options);

  return toast(content, { ...options, type });
}

/**
 * Thin wrappers to keep call sites readable and standardized.
 */
export const showSuccessToast = (message, opts) =>
  emit("success", message, opts);
export const showErrorToast = (message, opts) => emit("error", message, opts);
export const showInfoToast = (message, opts) => emit("info", message, opts);
export const showWarningToast = (message, opts) =>
  emit("warning", message, opts);

/**
 * Toast dismiss helpers for targeted and global cleanup.
 */
export const dismissToast = (id) => toast.dismiss(id);
export const dismissAllToasts = () => toast.dismiss();
