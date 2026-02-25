/**
 * @helper isAutoLocked
 *
 * Returns whether a post should be treated as auto-locked based on its creation date.
 *
 * Rules:
 * - Auto-lock kicks in after 7 days from `createdAt`.
 * - If `createdAt` is missing or not a Firestore Timestamp (no `toDate()`), returns `false`.
 *
 * @param {import("firebase/firestore").Timestamp|null|undefined} createdAt - Post creation timestamp.
 * @returns {boolean} True when the 7-day window has passed.
 */
export const isAutoLocked = (createdAt) => {
  if (!createdAt?.toDate) return false;
  const createdDate = createdAt.toDate();
  return Date.now() > createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;
};
