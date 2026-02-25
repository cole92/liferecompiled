// Clean builder: builds a Firestore Query for the Home feed, does not execute it.
import {
  collection,
  query,
  where,
  orderBy,
  startAfter,
  limit,
} from "firebase/firestore";

import {
  PAGE_SIZE_DEFAULT,
  clampPageSize,
  ALLOWED_SORT,
  SORT_NEWEST,
  SORT_OLDEST,
  SORT_TRENDING,
} from "../constants/feed";

/**
 * @helper buildHomeFeedQuery
 *
 * Builds a Firestore Query for the Home feed.
 * No side effects: it only returns a Query object.
 *
 * Purpose:
 * - Centralizes feed rules (deleted=false), optional category filtering, and sorting.
 * - Ensures stable pagination (limit + startAfter).
 * - Sanitizes inputs (pageSize, sortBy, category).
 *
 * Rules and fallbacks:
 * - pageSize is clamped to the allowed range (see clampPageSize()).
 * - sortBy must be in ALLOWED_SORT; fallback is SORT_NEWEST.
 * - category is an optional string (trimmed); empty -> ignored.
 *
 * Sorting behavior:
 * - Trending view: only trending posts, ordered by lastHotAt desc (then createdAt desc).
 * - Category active: always newest first (createdAt desc).
 * - No category: uses selected sort (newest/oldest) over createdAt.
 *
 * Note:
 * - This function does not call Firestore. The caller should run getDocs(query).
 *
 * @param {Object} opts
 * @param {import("firebase/firestore").Firestore} opts.db - Firestore instance
 * @param {import("firebase/firestore").DocumentSnapshot|null} [opts.afterDoc=null] - cursor for Load More
 * @param {number} [opts.pageSize] - requested page size (clamped)
 * @param {string} [opts.category] - optional category filter
 * @param {string} [opts.sortBy] - 'newest' | 'oldest' | 'trending'
 * @returns {import("firebase/firestore").Query} Firestore Query for posts
 */
export function buildHomeFeedQuery({
  db,
  afterDoc = null,
  pageSize,
  category,
  sortBy = SORT_NEWEST,
}) {
  // Sanitize pageSize and sortBy
  const size = clampPageSize(pageSize ?? PAGE_SIZE_DEFAULT);
  const safeSort = ALLOWED_SORT.has(sortBy) ? sortBy : SORT_NEWEST;

  // Base collection + query parts
  const col = collection(db, "posts");
  const parts = [];

  // Minimal filter: never show deleted posts
  parts.push(where("deleted", "==", false));

  // Normalize category (trim; ignore if empty)
  const normalizedCategory =
    typeof category === "string" ? category.trim() : "";

  // Trending view: only trending posts (category ignored)
  if (safeSort === SORT_TRENDING) {
    parts.push(where("badges.trending", "==", true));
    parts.push(orderBy("lastHotAt", "desc"));

    // Tie-breaker for more stable pagination
    parts.push(orderBy("createdAt", "desc"));
  } else if (normalizedCategory) {
    // Category view always uses newest first
    parts.push(where("category", "==", normalizedCategory));
    parts.push(orderBy("createdAt", "desc"));
  } else {
    // Global feed uses the selected createdAt direction
    const dir = safeSort === SORT_OLDEST ? "asc" : "desc";
    parts.push(orderBy("createdAt", dir));
  }

  // Cursor pagination (Load More)
  if (afterDoc) {
    parts.push(startAfter(afterDoc));
  }

  // Limit should be last
  parts.push(limit(size));

  // Return a pure Firestore Query (no side effects)
  return query(col, ...parts);
}
