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

export function buildHomeFeedQuery({
  db,
  afterDoc = null,
  pageSize,
  category,
  sortBy = SORT_NEWEST,
}) {
  // 1) Klampujemo pageSize i sanitizujemo sortBy
  const size = clampPageSize(pageSize ?? PAGE_SIZE_DEFAULT);
  const safeSort = ALLOWED_SORT.has(sortBy) ? sortBy : SORT_NEWEST;

  // baza upita
  const col = collection(db, "posts");
  const parts = [];

  // Uvek filtriramo deleted == false
  parts.push(where("deleted", "==", false));

  // Logika kategorije i sortiranja

  if (category) {
    // Ako postoji kategorija, v1 fiksira desc da bi bio potreban samo jedan indeks
    parts.push(where("category", "==", category));
    parts.push(orderBy("createdAt", "desc"));
  } else {
    // Bez kategorije, postujemo sortBy (newest/oldest)
    const dir = safeSort === SORT_OLDEST ? "asc" : "desc";
    parts.push(orderBy("createdAt", dir));
  }

  // 4) Kursor i limit
  if (afterDoc) {
    parts.push(startAfter(afterDoc));
  }

  parts.push(limit(size));

  // 5) Vrati Query (bez side-effecta)
  return query(col, ...parts);
}
