// src/utils/moderationUtils.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { showErrorToast } from "./toastUtils";

/**
 * Centralizovana logika za otvaranje prijavljenog targeta
 * (post ili comment) na osnovu report objekta.
 *
 * @param {Object} params
 * @param {Object} params.report - Report dokument (type, targetId, ...)
 * @param {Function} params.navigate - React Router navigate funkcija
 */
export const openReportTarget = async ({ report, navigate }) => {
  if (!report || !navigate) return;

  // 1) Post report -> direktno otvaramo /post/:postId
  if (report.type === "post") {
    navigate(`/post/${report.targetId}`);
    return;
  }

  // 2) Comment report -> nadji parent post preko comments/{commentId}
  if (report.type === "comment") {
    try {
      const commentRef = doc(db, "comments", report.targetId);
      const commentSnap = await getDoc(commentRef);

      if (!commentSnap.exists()) {
        showErrorToast("Comment no longer exists.");
        return;
      }

      const commentData = commentSnap.data();
      const postId = commentData.postID; // polje iz Firestore-a

      if (!postId) {
        console.error(
          "Comment document has no postID field:",
          report.targetId
        );
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

  // Fallback za nepoznat type (ako se ikad desi)
  console.error("Unsupported report type:", report);
  showErrorToast("Unsupported report type.");
};
