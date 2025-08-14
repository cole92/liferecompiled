import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export function buildReportId(type, targetId, reportedBy) {
    return `${type}_${targetId}_${reportedBy}`
};

export function makeReportPayload({type, targetId, reportedBy, reason}) {
    return {
        type,
        targetId,
        reportedBy,
        reason,
        createdAt: serverTimestamp()
    };
};

export async function submitReport({ type, targetId, reportedBy, reason }) {
    const reportId = buildReportId(type, targetId, reportedBy);
    const payload = makeReportPayload({ type, targetId, reportedBy, reason })
    await setDoc(doc(db, "reports", reportId), payload)
}