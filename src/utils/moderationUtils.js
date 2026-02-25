// src/utils/moderationUtils.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { showErrorToast } from "./toastUtils";

/**
 * @helper openReportTarget
 *
 * Centralized navigation helper for opening a reported target (post or comment).
 *
 * Why:
 * - Keeps moderation UI dumb: it can call one helper and let this function resolve routing.
 * - Handles missing/invalid targets gracefully with user-facing toasts (no hard crashes).
 *
 * Behavior:
 * - `type === "post"` -> navigates directly to `/post/:postId`.
 * - `type === "comment"` -> resolves parent post id via `comments/{commentId}` doc, then navigates to `/post/:postId`.
 * - Unknown `type` -> logs and shows a toast (defensive guard for unexpected data).
 *
 * @param {Object} params
 * @param {Object} params.report - Report doc containing at least `type` and `targetId`.
 * @param {Function} params.navigate - React Router `navigate` function.
 * @returns {Promise<void>} Resolves after navigation / error handling.
 */
export const openReportTarget = async ({ report, navigate }) => {
  if (!report || !navigate) return;

  // Post reports can route directly using the target id
  if (report.type === "post") {
    navigate(`/post/${report.targetId}`);
    return;
  }

  // Comment reports must resolve the parent post id first
  if (report.type === "comment") {
    try {
      const commentRef = doc(db, "comments", report.targetId);
      const commentSnap = await getDoc(commentRef);

      if (!commentSnap.exists()) {
        showErrorToast("Comment no longer exists.");
        return;
      }

      const commentData = commentSnap.data();
      const postId = commentData.postID; // Firestore field name

      if (!postId) {
        console.error("Comment document has no postID field:", report.targetId);
        showErrorToast("Could not find parent post for this comment.");
        return;
      }

      navigate(`/post/${postId}`);
    } catch (error) {
      console.error("Failed to open target for comment:", error);
      showErrorToast("Failed to open comment target. Please try again.");
    }
    return;
  }

  // Defensive fallback for unexpected report types
  console.error("Unsupported report type:", report);
  showErrorToast("Unsupported report type.");
};
