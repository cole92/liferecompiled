import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useState, useEffect } from "react";

/**
 * @hook useCheckSavedStatus
 *
 * Checks whether a specific post is saved by the current user.
 *
 * Behavior:
 * - Reads from `users/{uid}/savedPosts/{postId}` subcollection.
 * - If the document exists → post is considered saved.
 * - Skips execution when `user` or `postId` is missing.
 *
 * Design notes:
 * - This is a one-time check per dependency change (not a real-time listener).
 * - Returns `setIsSaved` to allow optimistic UI updates after save/unsave actions.
 * - Firestore read is lightweight (single document lookup).
 *
 * @param {Object|null} user - Authenticated user object (must contain `uid`)
 * @param {string|null} postId - ID of the post to check
 * @returns {{ isSaved: boolean, setIsSaved: Function }}
 */
export const useCheckSavedStatus = (user, postId) => {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Guard: do not query Firestore if prerequisites are missing.
    if (!user || !postId) return;

    const checkIfSaved = async () => {
      const ref = doc(db, "users", user.uid, "savedPosts", postId);
      const snap = await getDoc(ref);

      // Existence of the document defines saved state.
      setIsSaved(snap.exists());
    };

    checkIfSaved();
  }, [user, postId]);

  return { isSaved, setIsSaved };
};
