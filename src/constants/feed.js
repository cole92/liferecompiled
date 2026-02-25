// ------------------------------------------------------
// Pagination config – centralized limits and guardrails for feed queries.
// This file defines hard boundaries shared across Home, Dashboard, etc.
// ------------------------------------------------------

// Page size defaults for all paginated lists.
// Range [8, 32] keeps UI responsive and prevents overly heavy queries.
export const PAGE_SIZE_DEFAULT = 16;
export const PAGE_SIZE_MIN = 8;
export const PAGE_SIZE_MAX = 32;

/**
 * @helper clampPageSize
 * Defensive guard that constrains incoming page size to a safe range.
 *
 * Why:
 * - Prevents extreme values from query params (e.g. 0, negative, 9999)
 * - Keeps Firestore queries predictable and performant
 * - Ensures consistent UX across devices
 *
 * Rules:
 * - If `n` is invalid → fallback to DEFAULT
 * - Always clamp to [PAGE_SIZE_MIN, PAGE_SIZE_MAX]
 *
 * @param {number} n - requested page size (may come from URL or user input)
 * @returns {number} sanitized page size within allowed range
 */
export function clampPageSize(n) {
  // Coerce to integer if possible; fallback protects against NaN/undefined/string noise.
  const num = Number.isFinite(n) ? Math.floor(n) : PAGE_SIZE_DEFAULT;

  // Enforce lower and upper bounds.
  if (num < PAGE_SIZE_MIN) return PAGE_SIZE_MIN;
  if (num > PAGE_SIZE_MAX) return PAGE_SIZE_MAX;

  return num;
}

// Feed sort modes (v1).
// These values are shared between UI controls and query builders.
export const SORT_NEWEST = "newest";
export const SORT_OLDEST = "oldest";
export const SORT_TRENDING = "trending";

// Allowed sort values used for sanitizing external input (e.g. query params).
// Prevents invalid sort keys from reaching query logic.
export const ALLOWED_SORT = new Set([SORT_NEWEST, SORT_OLDEST, SORT_TRENDING]);
