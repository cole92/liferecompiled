// centralizacija velicine stranice (paginacija)
export const PAGE_SIZE_DEFAULT = 16;
export const PAGE_SIZE_MIN = 8;
export const PAGE_SIZE_MAX = 32;

// Defanzivno klampovanje ulazne vrednosti na opseg 8–32
export function clampPageSize(n) {
  const num = Number.isFinite(n) ? Math.floor(n) : PAGE_SIZE_DEFAULT;
  if (num < PAGE_SIZE_MIN) return PAGE_SIZE_MIN;
  if (num > PAGE_SIZE_MAX) return PAGE_SIZE_MAX;
  return num;
}

// Dozvoljeni smerovi sortiranja u v1 (bez metrika)
export const SORT_NEWEST = "newest";
export const SORT_OLDEST = "oldest";
export const ALLOWED_SORT = new Set([SORT_NEWEST, SORT_OLDEST]);
