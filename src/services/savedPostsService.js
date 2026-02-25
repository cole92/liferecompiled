import {
  collection,
  query,
  orderBy,
  startAfter,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * @helper buildSavedQuery
 *
 * Builds a Firestore query for a user's `savedPosts` subcollection.
 *
 * - Orders by `savedAt` (newest first by default) to support stable paging.
 * - Uses cursor-based pagination via `afterDoc` + `startAfter`.
 * - Re-used for initial load and "Load more" flows.
 *
 * @param {Object} params
 * @param {string} params.uid - User id (owner of the `savedPosts` subcollection).
 * @param {import("firebase/firestore").DocumentSnapshot|null} [params.afterDoc=null] - Pagination cursor for `startAfter`.
 * @param {number} [params.pageSize=10] - Page size limit.
 * @param {"asc"|"desc"} [params.sortDirection="desc"] - Sort direction for `savedAt`.
 * @returns {import("firebase/firestore").Query} Firestore Query ready for `getDocs` / `onSnapshot`.
 */
export function buildSavedQuery({
  uid,
  afterDoc = null,
  pageSize = 10,
  sortDirection = "desc",
}) {
  const baseRef = collection(db, "users", uid, "savedPosts");
  const parts = [orderBy("savedAt", sortDirection), limit(pageSize)];

  if (afterDoc) {
    // Cursor paging: resume after the last visible doc
    return query(
      baseRef,
      orderBy("savedAt", sortDirection),
      startAfter(afterDoc),
      limit(pageSize),
    );
  }

  return query(baseRef, ...parts);
}
