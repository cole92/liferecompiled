// ------------------------------------------------------
// Paginacija – centralizovane vrednosti i klampovanje
// Ovaj fajl drzi jedinstvene granice i smerove za feed.
// ------------------------------------------------------

// Velicine stranice za feed (globalni opseg za sve liste)
// Minimalno 8, maksimalno 32 – drzi UI responsivnim i stabilnim
export const PAGE_SIZE_DEFAULT = 16;
export const PAGE_SIZE_MIN = 8;
export const PAGE_SIZE_MAX = 32;

/**
 * @helper clampPageSize
 * Defanzivno ogranicava ulaznu vrednost na dozvoljeni opseg.
 *
 * Razlozi:
 * - Zastita server-side upita od ekstremnih vrednosti (npr. 0, 9999)
 * - UI ostaje konzistentan i performantan na svim uredjajima
 *
 * Pravila:
 * - Ako je n nevalidan → koristi DEFAULT
 * - Klampuje na [PAGE_SIZE_MIN, PAGE_SIZE_MAX]
 *
 * @param {number} n - trazena velicina stranice
 * @returns {number} velicina u dozvoljenom opsegu
 */
export function clampPageSize(n) {
  // Pretvori u broj (za slucajeve kada stigne string iz query params)
  const num = Number.isFinite(n) ? Math.floor(n) : PAGE_SIZE_DEFAULT;

  // Donja i gornja granica
  if (num < PAGE_SIZE_MIN) return PAGE_SIZE_MIN;
  if (num > PAGE_SIZE_MAX) return PAGE_SIZE_MAX;

  return num;
}

// Sortiranje feed-a (v1)
export const SORT_NEWEST = "newest";
export const SORT_OLDEST = "oldest";
export const SORT_TRENDING = "trending";

// Dozvoljeni smerovi – koristi se za sanitizaciju unosa (safeSort)
export const ALLOWED_SORT = new Set([SORT_NEWEST, SORT_OLDEST, SORT_TRENDING]);
