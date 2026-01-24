// src/utils/formatDate.js

const TZ = "Europe/Belgrade";
const LOCALE = "en-GB";

/**
 * formatPostDateLabel
 * - compact: short label for XS (less width)
 * - edited: choose "Edited:" vs "Posted:"
 * - stable across OS/browser via Intl + fixed timeZone
 */
export function formatPostDateLabel(post, { compact = false } = {}) {
  const ts = post?.updatedAt || post?.createdAt;
  if (!ts?.toDate) return "";

  const d = ts.toDate();

  // XS: "24 Jan" (short, stable)
  if (compact) {
    const dateStr = new Intl.DateTimeFormat(LOCALE, {
      timeZone: TZ,
      day: "2-digit",
      month: "short",
    }).format(d);

    return post?.updatedAt ? `Edited: ${dateStr}` : `Posted: ${dateStr}`;
  }

  // sm+: "2026-01-24" (ISO-like, stable)
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

  return post?.updatedAt ? `Last edited: ${dateStr}` : `Posted: ${dateStr}`;
}
