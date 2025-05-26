import { functions } from "../../firebase";
import { httpsCallable } from "firebase/functions";

/**
 * Dodaje novi komentar u Firestore kolekciju "comments".
 *
 * @param {string} postId - ID posta na koji se dodaje komentar.
 * @param {string} content - Tekst komentara.
 * @param {string | null} parentId - ID roditeljskog komentara (ako je odgovor), ili `null` ako je glavni komentar.
 * @returns {Promise<string>} - Vraca ID novog komentara ako je uspesno dodat.
 */
export const addComment = async (postId, content, parentId = null) => {
  const addCommentFn = httpsCallable(functions, "addCommentSecure");

  try {
    const result = await addCommentFn({ postId, content, parentId });
    return result.data.commentId;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw new Error("Adding the comment failed.");
  }
};

/**
 * Poziva Firebase Cloud Function za soft delete komentara.
 *
 * @param {Object} params
 * @param {string} params.commentId - ID komentara koji se oznacava kao obrisan.
 * @returns {Promise<Object>} - Vraca response objekat iz Cloud Function-a.
 */
export const softDeleteComment = async ({ commentId }) => {
  const softDeleteFn = httpsCallable(functions, "softDeleteComment");
  return await softDeleteFn({ commentId });
};
