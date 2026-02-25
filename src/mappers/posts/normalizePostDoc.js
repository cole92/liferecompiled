/**
 * @helper normalizePostDoc
 *
 * Converts a Firestore document snapshot into a stable UI-ready post object.
 * Returns `null` if required MVP fields are missing or invalid.
 *
 * MVP contract:
 * - UI ALWAYS receives stable aggregate fields (`reactionCounts`, `badges`, etc.)
 * - No `undefined` for fields that UI renders directly
 * - No client-side fallback math for reactions/comments
 * - Backend remains authoritative for counters and badge logic
 *
 * Validation strategy:
 * - Hard-fail (return null) when core invariants are broken
 * - Soft-default optional fields to safe values
 *
 * @param {import("firebase/firestore").DocumentSnapshot} docSnap
 * @returns {Object|null}
 */
export function normalizePostDoc(docSnap) {
  if (!docSnap || typeof docSnap.data !== "function") {
    return null;
  }

  const data = docSnap.data() || {};
  const id = docSnap.id;

  // Title is mandatory and must be a non-empty string.
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!id || !title) return null;

  // createdAt must be a valid Firestore Timestamp.
  const rawCreatedAt = data.createdAt;
  if (!rawCreatedAt || typeof rawCreatedAt.toDate !== "function") {
    return null;
  }

  const createdAtDate = rawCreatedAt.toDate();
  if (
    !(createdAtDate instanceof Date) ||
    Number.isNaN(createdAtDate.getTime())
  ) {
    return null;
  }

  // Optional description (safe-trimmed).
  const description =
    typeof data.description === "string" ? data.description.trim() : "";

  // Content is always a string in MVP; preserve formatting (no trim).
  const content = typeof data.content === "string" ? data.content : "";

  // Optional category; undefined if invalid to avoid rendering empty pills.
  const category =
    typeof data.category === "string" && data.category.trim()
      ? data.category.trim()
      : undefined;

  // Tags normalization (legacy-safe):
  // - Accepts string or { text }
  // - Trims values
  // - Filters invalid entries
  const tags = Array.isArray(data.tags)
    ? data.tags
        .map((tag) => {
          if (typeof tag === "string" && tag.trim()) {
            return { text: tag.trim() };
          }
          if (tag?.text && typeof tag.text === "string" && tag.text.trim()) {
            return { text: tag.text.trim() };
          }
          return null;
        })
        .filter(Boolean)
    : [];

  // userId is optional but normalized to null if invalid.
  const userId =
    typeof data.userId === "string" && data.userId.trim()
      ? data.userId.trim()
      : null;

  // Stable aggregate counters (backend authoritative).
  // Never allow undefined to leak into UI.
  const reactionCounts = {
    idea: Number.isFinite(data.reactionCounts?.idea)
      ? data.reactionCounts.idea
      : 0,
    hot: Number.isFinite(data.reactionCounts?.hot)
      ? data.reactionCounts.hot
      : 0,
    powerup: Number.isFinite(data.reactionCounts?.powerup)
      ? data.reactionCounts.powerup
      : 0,
  };

  const badges = {
    mostInspiring: Boolean(data.badges?.mostInspiring),
    trending: Boolean(data.badges?.trending),
  };

  // lastHotAt must be a Timestamp-like object (used for sorting logic).
  const lastHotAt =
    data.lastHotAt && typeof data.lastHotAt.toDate === "function"
      ? data.lastHotAt
      : null;

  // Comments count is stable numeric aggregate.
  const commentsCount = Number.isFinite(data.commentsCount)
    ? data.commentsCount
    : 0;

  const locked = Boolean(data.locked);
  const lockedAt = data.lockedAt ?? null;

  return {
    id,
    userId,
    title,
    description,
    content,
    category,
    tags,

    // Preserve raw Timestamp for sorting and formatting upstream.
    createdAt: rawCreatedAt,
    updatedAt: data.updatedAt ?? null,

    reactionCounts,
    badges,
    lastHotAt,
    commentsCount,

    locked,
    lockedAt,
  };
}
