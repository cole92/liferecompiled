import { unsavePost, savePost } from "../services/savedService";
import { showErrorToast, showInfoToast, showSuccessToast } from "./toastUtils";

const SAVE_AUTH_TOAST_ID = "saved:auth";
const SAVE_STATUS_TOAST_ID = "saved:status";
const SAVE_ERROR_TOAST_ID = "saved:error";

/**
 * @helper toggleSavePost
 *
 * Toggles saved state for a post and returns the next boolean state for the caller.
 *
 * Why:
 * - Centralizes save/unsave + toast messaging so UI components stay simple.
 * - Returns the next state explicitly (instead of mutating) to keep UI state updates predictable.
 *
 * Behavior:
 * - If user is missing -> shows an auth toast and returns the current state (no UI change).
 * - If currently saved -> deletes the saved doc, shows success toast, returns `false`.
 * - If not saved -> writes the saved doc (+ optional snapshot), shows success toast, returns `true`.
 * - On error -> logs, shows error toast, returns the previous state (no optimistic flip).
 *
 * Toasts:
 * - Uses fixed toast ids to prevent stacking duplicates during rapid clicks.
 *
 * @param {Object|null} user - Current auth user (expects `uid`).
 * @param {string} postId - Post id used as saved doc id.
 * @param {boolean} isSaved - Current saved state.
 * @param {Object} snapshot - Optional cached fields for `savePost`.
 * @returns {Promise<boolean>} Next saved state for the UI.
 */
export const toggleSavePost = async (user, postId, isSaved, snapshot) => {
  if (!user) {
    showInfoToast("Please login to save posts.", {
      toastId: SAVE_AUTH_TOAST_ID,
    });
    return isSaved; // important: do not change local state
  }

  try {
    if (isSaved) {
      await unsavePost(user.uid, postId);

      showSuccessToast("Removed from saved!", {
        toastId: SAVE_STATUS_TOAST_ID,
        autoClose: 1200,
      });

      return false;
    } else {
      await savePost(user.uid, postId, snapshot);

      showSuccessToast("Post saved!", {
        toastId: SAVE_STATUS_TOAST_ID,
        autoClose: 1200,
      });

      return true;
    }
  } catch (error) {
    console.error(error);

    showErrorToast("Something went wrong.", {
      toastId: SAVE_ERROR_TOAST_ID,
    });

    return isSaved;
  }
};
