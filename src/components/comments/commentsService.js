// components/comments/commentsService.js
import { functions } from "../../firebase";
import { httpsCallable } from "firebase/functions";

// Add a new comment using the Cloud Function "addCommentSecure"
export const addComment = async (postId, content, parentId = null) => {
  const addCommentFn = httpsCallable(functions, "addCommentSecure");

  try {
    const result = await addCommentFn({ postId, content, parentId });
    return result.data?.commentId;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

// Soft-delete comment using the Cloud Function "softDeleteComment"
export const softDeleteComment = async ({ commentId }) => {
  const softDeleteFn = httpsCallable(functions, "softDeleteComment");
  return await softDeleteFn({ commentId });
};
