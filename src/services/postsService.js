// services/postsService.js
import {
  collection,
  query,
  where,
  orderBy,
  startAfter,
  limit,
  startAt,
  endAt,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * @helper buildPostsQuery
 *
 * Builds a Firestore query for the MyPosts list with filters, pagination,
 * and optional server-side prefix search by title (`title_lc`).
 *
 * Modes:
 * - Search mode (when `q.trim().length > 0`):
 *   - Filters by `userId` and `deleted:false`
 *   - Orders by `title_lc` to enable case-insensitive prefix search
 *   - Uses `startAt(normalizedQ)` + `endAt(normalizedQ + "\uf8ff")`
 *   - Ignores `filter` (`active` / `locked`) to avoid mixed ordering/constraints
 *
 * - Normal mode (when `q` is empty/whitespace):
 *   - Filters by `userId` and `deleted:false`
 *   - Orders by `createdAt` (desc) for newest-first listing
 *   - Applies optional lock filter:
 *     - `filter === "active"` -> `locked:false`
 *     - `filter === "locked"` -> `locked:true`
 *
 * Pagination:
 * - Uses `afterDoc` (DocumentSnapshot) as a cursor via `startAfter`
 * - `pageSize` controls the `limit` (default 10)
 *
 * @param {Object} options
 * @param {string} options.userId - User id whose posts are listed.
 * @param {"all"|"active"|"locked"} options.filter - Normal-mode filter (ignored in search mode).
 * @param {import("firebase/firestore").DocumentSnapshot|null} [options.afterDoc=null] - Cursor for pagination.
 * @param {number} [options.pageSize=10] - Page size limit.
 * @param {string} [options.q=""] - Prefix search input for `title_lc`.
 * @returns {import("firebase/firestore").Query} Firestore Query ready for `getDocs`.
 */
const buildPostsQuery = ({
  userId,
  filter,
  afterDoc = null,
  pageSize = 10,
  q = "",
}) => {
  const collectionRef = collection(db, "posts");
  const trimmedQ = q.trim();

  if (trimmedQ.length > 0) {
    const normalizedQ = trimmedQ.toLowerCase();

    const constraints = [
      where("userId", "==", userId),
      where("deleted", "==", false),
      orderBy("title_lc"),
      startAt(normalizedQ),
      endAt(normalizedQ + "\uf8ff"),
    ];

    if (afterDoc) {
      constraints.push(startAfter(afterDoc));
    }

    constraints.push(limit(pageSize));

    return query(collectionRef, ...constraints);
  }

  // Base constraints: author + not deleted + newest first
  const constraints = [
    where("userId", "==", userId),
    where("deleted", "==", false),
    orderBy("createdAt", "desc"),
  ];

  // Optional lock filter (normal mode only)
  if (filter === "active") constraints.push(where("locked", "==", false));
  if (filter === "locked") constraints.push(where("locked", "==", true));

  // Cursor-based pagination
  if (afterDoc) constraints.push(startAfter(afterDoc));

  // Page size limit
  constraints.push(limit(pageSize));

  return query(collectionRef, ...constraints);
};

export default buildPostsQuery;
