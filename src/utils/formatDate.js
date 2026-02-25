// src/utils/formatDate.js

const TZ = "Europe/Belgrade";
const LOCALE = "en-GB";

/**
 * @helper formatPostDateLabel
 *
 * Formats a stable, timezone-fixed date label for post metadata.
 *
 * Why:
 * - Uses `Intl.DateTimeFormat` with a fixed `timeZone` to avoid OS/browser timezone drift.
 * - Supports a compact label for XS screens and a longer ISO-like label for wider layouts.
 *
 * Behavior:
 * - Prefers `updatedAt` over `createdAt` for the displayed timestamp.
 * - Returns an empty string when the timestamp is missing or not a Firestore Timestamp.
 *
 * @param {Object} post - Post object with `createdAt` / `updatedAt` Firestore timestamps.
 * @param {Object} [options]
 * @param {boolean} [options.compact=false] - Use shorter label for small screens.
 * @returns {string} Human-readable label ("Posted:" / "Edited:" / "Last edited:").
 */
export function formatPostDateLabel(post, { compact = false } = {}) {
  const ts = post?.updatedAt || post?.createdAt;
  if (!ts?.toDate) return "";

  const d = ts.toDate();

  // XS: short label (less width)
  if (compact) {
    const dateStr = new Intl.DateTimeFormat(LOCALE, {
      timeZone: TZ,
      day: "2-digit",
      month: "short",
    }).format(d);

    return post?.updatedAt ? `Edited: ${dateStr}` : `Posted: ${dateStr}`;
  }

  // sm+: ISO-like format (stable + sortable-looking)
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

  return post?.updatedAt ? `Last edited: ${dateStr}` : `Posted: ${dateStr}`;
}
