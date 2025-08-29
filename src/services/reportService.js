import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Generise jedinstveni ID za report dokument u Firestore.
 *
 * @param {string} type - Tip resursa koji se prijavljuje (post ili komentar).
 * @param {string} targetId - ID ciljanog resursa (postId ili commentId).
 * @param {string} reportedBy - UID korisnika koji prijavljuje.
 * @returns {string} Spojeni string koji sluzi kao ID dokumenta.
 */

export function buildReportId(type, targetId, reportedBy) {
  return `${type}_${targetId}_${reportedBy}`;
}

/**
 * Formira payload objekat koji ce biti upisan u Firestore.
 *
 * @param {Object} params - Parametri za kreiranje prijave.
 * @param {string} params.type - Tip resursa koji se prijavljuje.
 * @param {string} params.targetId - ID resursa.
 * @param {string} params.reportedBy - UID korisnika koji prijavljuje.
 * @returns {Object} Objekat sa osnovnim podacima i timestamp-om.
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
 * Salje report u Firestore bazu.
 *
 * - Generise ID pomocu buildReportId
 * - Formira payload pomocu makeReportPayload
 * - Upisuje dokument u kolekciju "reports"
 *
 * @async
 * @param {Object} params - Podaci o prijavi.
 * @param {string} params.type - Tip resursa.
 * @param {string} params.targetId - ID resursa.
 * @param {string} params.reportedBy - UID korisnika koji prijavljuje.
 * @returns {Promise<void>} Promise koji se razresava kada je upis zavrsen.
 */

export async function submitReport({ type, targetId, reportedBy }) {
  const reportId = buildReportId(type, targetId, reportedBy);
  const payload = makeReportPayload({ type, targetId, reportedBy });
  await setDoc(doc(db, "reports", reportId), payload);
}
