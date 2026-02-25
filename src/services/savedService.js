import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { serverTimestamp } from "firebase/firestore";

/**
 * Saves a post into the user's `savedPosts` subcollection.
 *
 * - Writes to `users/{userId}/savedPosts/{postId}` so the saved doc id is stable per post.
 * - Uses `serverTimestamp()` for `savedAt` to keep ordering consistent across clients.
 * - Optionally stores a lightweight snapshot for faster saved list rendering.
 *
 * @async
 * @param {string} userId - User id who saves the post.
 * @param {string} postId - Post id used as the saved doc id.
 * @param {Object} [snapshot={}] - Optional cached fields (e.g. title/author) for list UI.
 * @returns {Promise<void>} Resolves when the write completes.
 */
export const savePost = async (userId, postId, snapshot = {}) => {
  const ref = doc(db, "users", userId, "savedPosts", postId);

  await setDoc(ref, {
    savedAt: serverTimestamp(),
    ...snapshot,
  });
};

/**
 * Removes a post from the user's saved list.
 *
 * - Deletes `users/{userId}/savedPosts/{postId}`.
 *
 * @async
 * @param {string} userId - User id who unsaves the post.
 * @param {string} postId - Saved doc id (same as post id).
 * @returns {Promise<void>} Resolves when the delete completes.
 */
export const unsavePost = async (userId, postId) => {
  const ref = doc(db, "users", userId, "savedPosts", postId);
  await deleteDoc(ref);
};
