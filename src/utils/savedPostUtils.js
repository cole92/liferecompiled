import { unsavePost, savePost } from "../services/savedService";
import { showErrorToast, showInfoToast, showSuccessToast } from "./toastUtils";

const SAVE_AUTH_TOAST_ID = "saved:auth";
const SAVE_STATUS_TOAST_ID = "saved:status";
const SAVE_ERROR_TOAST_ID = "saved:error";

export const toggleSavePost = async (user, postId, isSaved, snapshot) => {
  if (!user) {
    return showInfoToast("Please login to save posts.", {
      toastId: SAVE_AUTH_TOAST_ID,
    });
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
