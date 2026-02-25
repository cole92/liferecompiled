// components/comments/commentsService.js
import { functions } from "../../firebase";
import { httpsCallable } from "firebase/functions";

/**
 * @helper addComment
 *
 * Writes a comment via Cloud Function (`addCommentSecure`) instead of direct Firestore writes.
 * This keeps validation + rate limiting on the server (security gate).
 *
 * @param {string} postId - Target post id.
 * @param {string} content - Raw comment text (server trims/validates).
 * @param {string|null} parentId - Parent comment id for replies (null for root).
 * @returns {Promise<string|undefined>} New comment id (if returned by the function).
 */
export const addComment = async (postId, content, parentId = null) => {
  // Callable wrapper is created on demand to keep usage local to this helper.
  const addCommentFn = httpsCallable(functions, "addCommentSecure");

  try {
    const result = await addCommentFn({ postId, content, parentId });
    return result.data?.commentId;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

/**
 * @helper softDeleteComment
 *
 * Soft-deletes a comment via Cloud Function (`softDeleteComment`) to enforce
 * author/admin checks on the server and keep client logic simple.
 *
 * @param {{ commentId: string }} params
 * @returns {Promise<import("firebase/functions").HttpsCallableResult>}
 */
export const softDeleteComment = async ({ commentId }) => {
  const softDeleteFn = httpsCallable(functions, "softDeleteComment");
  return await softDeleteFn({ commentId });
};
