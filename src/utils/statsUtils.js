import dayjs from "dayjs";

/**
 * @helper getPostsPerMonth
 *
 * Aggregates post counts per month based on `createdAt`.
 *
 * Why:
 * - Produces chart-friendly `{ month: "YYYY-MM", count }` buckets.
 * - Uses a stable month key format ("YYYY-MM") for easy sorting and merging.
 *
 * Assumptions:
 * - Each post has a Firestore Timestamp in `createdAt` (must support `toDate()`).
 *
 * @param {Array<Object>} posts - Posts array (expects `createdAt` Firestore Timestamp).
 * @returns {Array<{month: string, count: number}>} Sorted monthly counts by `month` ascending.
 */
export const getPostsPerMonth = (posts) => {
  const counts = {};

  posts.forEach((post) => {
    const date = post.createdAt.toDate();
    const month = dayjs(date).format("YYYY-MM");

    counts[month] = (counts[month] || 0) + 1;
  });

  const result = Object.entries(counts).map(([month, count]) => ({
    month,
    count,
  }));

  result.sort((a, b) => a.month.localeCompare(b.month));
  return result;
};

/**
 * @helper last12MonthKeys
 *
 * Generates month keys for the last 12 months (including the current month).
 *
 * Why:
 * - Keeps stats charts stable by ensuring a fixed 12-slot window.
 * - Re-usable building block for filling missing months with zero counts.
 *
 * @returns {string[]} Array of month keys in "YYYY-MM" format.
 */
export function last12MonthKeys() {
  const start = dayjs().startOf("month").subtract(11, "month");
  return Array.from({ length: 12 }, (_, i) =>
    start.add(i, "month").format("YYYY-MM"),
  );
}

/**
 * @helper normalizeMonthlyArray
 *
 * Normalizes a month->count map into a fixed 12-month array with zero-filled gaps.
 *
 * Why:
 * - Chart components typically expect a consistent array length and continuous x-axis.
 * - Prevents "missing months" from collapsing the chart scale.
 *
 * @param {Object} pmObj - Map of `{ [monthKey]: count }` where monthKey is "YYYY-MM".
 * @returns {Array<{month: string, count: number}>} Last-12-month array with zero-filled months.
 */
export function normalizeMonthlyArray(pmObj) {
  const keys = last12MonthKeys();
  return keys.map((m) => ({ month: m, count: pmObj?.[m] || 0 }));
}
