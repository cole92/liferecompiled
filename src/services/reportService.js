import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * @helper buildReportId
 *
 * Builds a deterministic Firestore document id for a report.
 * Prevents duplicate reports for the same target by the same user.
 *
 * @param {string} type - Resource type being reported ("post" | "comment").
 * @param {string} targetId - Target resource id (postId or commentId).
 * @param {string} reportedBy - Reporter user uid.
 * @returns {string} Deterministic id: `${type}_${targetId}_${reportedBy}`.
 */
export function buildReportId(type, targetId, reportedBy) {
  return `${type}_${targetId}_${reportedBy}`;
}

/**
 * @helper makeReportPayload
 *
 * Creates the Firestore payload for a report document.
 * Uses `serverTimestamp()` so createdAt is set consistently by the backend.
 *
 * @param {Object} params
 * @param {string} params.type - Resource type being reported.
 * @param {string} params.targetId - Target resource id.
 * @param {string} params.reportedBy - Reporter user uid.
 * @returns {Object} Report payload with a server-side timestamp.
 */
export function makeReportPayload({ type, targetId, reportedBy }) {
  return {
    type,
    targetId,
    reportedBy,
    createdAt: serverTimestamp(),
  };
}

/**
 * Submits a report into Firestore.
 *
 * - Uses a deterministic id via `buildReportId` to de-dupe per user/target.
 * - Writes into `reports/{reportId}` via `setDoc` (create-or-replace).
 *
 * @async
 * @param {Object} params
 * @param {string} params.type - Resource type ("post" | "comment").
 * @param {string} params.targetId - Target resource id.
 * @param {string} params.reportedBy - Reporter user uid.
 * @returns {Promise<void>} Resolves when the write completes.
 */
export async function submitReport({ type, targetId, reportedBy }) {
  const reportId = buildReportId(type, targetId, reportedBy);
  const payload = makeReportPayload({ type, targetId, reportedBy });
  await setDoc(doc(db, "reports", reportId), payload);
}
