import dayjs from "dayjs";

/**
 * @function getPostsPerMonth
 * Agregira broj postova po mesecima na osnovu datuma kreiranja.
 *
 * - Koristi `dayjs` za formatiranje datuma u "YYYY-MM" oblik
 * - Grupise postove po mesecu i racuna broj postova u svakom mesecu
 * - Vraca sortirani niz objekata sa `month` i `count`
 *
 * @param {Array} posts - Niz postova sa `createdAt` poljem (Firestore Timestamp)
 * @returns {Array} Niz objekata: { month: "YYYY-MM", count: brojPostova }
 */

export const getPostsPerMonth = (posts) => {
  const counts = {};

  posts.forEach((post) => {
    const date = post.createdAt.toDate();
    const month = dayjs(date).format("YYYY-MM");

    if (counts[month]) {
      counts[month]++;
    } else {
      counts[month] = 1;
    }
  });
  const result = Object.entries(counts).map(([month, count]) => ({
    month,
    count,
  }));

  result.sort((a, b) => a.month.localeCompare(b.month));
  return result;
};

// NOVO — helper za popunjavanje praznih meseci
export function last12MonthKeys() {
  const start = dayjs().startOf("month").subtract(11, "month");
  return Array.from({ length: 12 }, (_, i) =>
    start.add(i, "month").format("YYYY-MM")
  );
}

export function normalizeMonthlyArray(pmObj) {
  const keys = last12MonthKeys();
  return keys.map((m) => ({ month: m, count: pmObj?.[m] || 0 }));
}
