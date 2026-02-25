import dayjs from "dayjs";

/**
 * @helper getDaysLeft
 *
 * Returns how many days remain until a soft-deleted post is eligible for permanent deletion.
 * If `deletedAt` is missing, returns `null` so callers can hide the countdown UI.
 *
 * Notes:
 * - Assumes a 30-day retention window starting from `deletedAt`.
 * - Clamps to `0` when the window has already expired (never returns negative days).
 *
 * @param {import("firebase/firestore").Timestamp|null|undefined} deletedAt - Firestore timestamp when the post was soft-deleted.
 * @returns {number|null} Days left in the retention window, or `null` if not deleted.
 */
export const getDaysLeft = (deletedAt) => {
  if (!deletedAt) return null;

  const deletedDate = dayjs(deletedAt.toDate());
  const today = dayjs();
  const daysPassed = today.diff(deletedDate, "day");
  const daysLeft = 30 - daysPassed;

  return daysLeft >= 0 ? daysLeft : 0;
};
