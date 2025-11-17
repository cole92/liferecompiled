// Cist builder: sastavlja Firestore Query za Home feed, ne izvrsava ga.
import {
  collection,
  query,
  where,
  orderBy,
  startAfter,
  limit,
} from "firebase/firestore";

import {
  PAGE_SIZE_DEFAULT,
  clampPageSize,
  ALLOWED_SORT,
  SORT_NEWEST,
  SORT_OLDEST,
} from "../constants/feed";

/**
 * @helper buildHomeFeedQuery
 * Gradi Firestore Query za Home feed; bez side-effecta, samo vraca Query objekat.
 *
 * Namena:
 * - Centralizuje logiku filtriranja (deleted=false), kategorije i sortiranja
 * - Obezbedjuje stabilnu paginaciju (limit + startAfter)
 * - Sanitizuje ulaze (pageSize, sortBy, category)
 *
 * Pravila i fallback:
 * - pageSize se klampuje na [PAGE_SIZE_MIN, PAGE_SIZE_MAX]
 * - sortBy mora biti u ALLOWED_SORT; fallback je newest
 * - category je opcioni string (trimovan); ako je prazan → ignorise se
 *
 * Sortiranje:
 * - Ako postoji category → uvek orderBy(createdAt, desc)
 *   (jer se kategori-sani feed obicno prikazuje od najnovijeg)
 * - Ako nema category → koristi se selected sort (newest/oldest)
 *
 * Napomena:
 * - Funkcija ne poziva Firestore; UI sloj poziva getDocs(query).
 *
 * @param {Object} opts
 * @param {Firestore} opts.db - Firestore instanca
 * @param {DocumentSnapshot|null} [opts.afterDoc=null] - kursor za Load More
 * @param {number} [opts.pageSize] - trazena velicina stranice (klampuje se)
 * @param {string} [opts.category] - opcioni filter kategorije
 * @param {string} [opts.sortBy] - 'newest' ili 'oldest'
 * @returns {Query} Firestore Query za posts
 */
export function buildHomeFeedQuery({
  db,
  afterDoc = null,
  pageSize,
  category,
  sortBy = SORT_NEWEST,
}) {
  // Sanitizacija pageSize i sortBy
  const size = clampPageSize(pageSize ?? PAGE_SIZE_DEFAULT);
  const safeSort = ALLOWED_SORT.has(sortBy) ? sortBy : SORT_NEWEST;

  // Bazna kolekcija + delovi Query-a
  const col = collection(db, "posts");
  const parts = [];

  // Minimalni filter: nikada ne prikazujemo obrisane postove
  parts.push(where("deleted", "==", false));

  // Normalizacija kategorije (trim; ignorisi ako je prazno)
  const normalizedCategory =
    typeof category === "string" ? category.trim() : "";

  // Sortiranje zavisi od toga da li je category aktivan filter
  if (normalizedCategory) {
    // Kada je kategorija aktivna, koristimo najnovije prvo (desc)
    parts.push(where("category", "==", normalizedCategory));
    parts.push(orderBy("createdAt", "desc"));
  } else {
    // Globalni feed: koristi izabrani smer sortiranja
    const dir = safeSort === SORT_OLDEST ? "asc" : "desc";
    parts.push(orderBy("createdAt", dir));
  }

  // Cursor paginacija (Load More)
  if (afterDoc) {
    parts.push(startAfter(afterDoc));
  }

  // Limit uvek poslednji deo Query-a
  parts.push(limit(size));

  // Vraca cist Firestore Query (nema side-effect-a)
  return query(col, ...parts);
}
