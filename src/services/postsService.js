// services/postsService.js
import {
  collection,
  query,
  where,
  orderBy,
  startAfter,
  limit,
  startAt,
  endAt,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * @helper buildPostsQuery
 *
 * Gradi Firestore upit za MyPosts listu sa podrskom za filtere, paginaciju
 * i opcioni server-side prefix search po naslovu (`title_lc`).
 *
 * Rezimi rada:
 * - Search mod (kada `q.trim().length > 0`):
 *   - Filtrira po `userId` i `deleted:false`
 *   - Sortira po `title_lc` (case-insensitive prefix search)
 *   - Koristi `startAt(normalizedQ)` + `endAt(normalizedQ + "\uf8ff")`
 *   - Ignorise dodatne filtere (`active` / `locked`) i uvek vraca sve neobrisane postove ciji naslov pocinje na `q`
 *
 * - Normal mod (kada je `q` prazan ili samo whitespace):
 *   - Filtrira po `userId` i `deleted:false`
 *   - Sortira po `createdAt` (desc) — najnoviji prvi
 *   - Primjenjuje filtere:
 *     - `filter === "active"`  → `locked:false`
 *     - `filter === "locked"`  → `locked:true`
 *
 * Paginacija:
 * - `afterDoc` (DocumentSnapshot) se koristi kao kursor preko `startAfter`
 * - `pageSize` kontrolise `limit` (default 10)
 *
 * @param {Object} options
 * @param {string} options.userId - ID korisnika ciji se postovi prikazuju
 * @param {"all"|"active"|"locked"} options.filter - Aktivni filter u normal modu (ignorise se u search modu)
 * @param {import("firebase/firestore").DocumentSnapshot|null} [options.afterDoc=null] - Kursor za paginaciju
 * @param {number} [options.pageSize=10] - Broj postova po strani
 * @param {string} [options.q=""] - Tekst za server-side prefix search po `title_lc`
 *
 * @returns {import("firebase/firestore").Query} Firestore Query spreman za `getDocs`
 */

const buildPostsQuery = ({
  userId,
  filter,
  afterDoc = null,
  pageSize = 10,
  q = "",
}) => {
  const collectionRef = collection(db, "posts");
  const trimmedQ = q.trim();

  if (trimmedQ.length > 0) {
    const normalizedQ = trimmedQ.toLowerCase();

    const constraints = [
      where("userId", "==", userId),
      where("deleted", "==", false),
      orderBy("title_lc"),
      startAt(normalizedQ),
      endAt(normalizedQ + "\uf8ff"),
    ];

    if (afterDoc) {
      constraints.push(startAfter(afterDoc));
    }

    constraints.push(limit(pageSize));

    return query(collectionRef, ...constraints);
  }

  // Osnovni uslovi: autor + neobrisani + sortiranje po datumu
  const constraints = [
    where("userId", "==", userId),
    where("deleted", "==", false),
    orderBy("createdAt", "desc"),
  ];

  // Primeni dodatni filter (ako postoji)
  if (filter === "active") constraints.push(where("locked", "==", false));
  if (filter === "locked") constraints.push(where("locked", "==", true));

  // Ako postoji kursor → dodaj startAfter
  if (afterDoc) constraints.push(startAfter(afterDoc));

  // Limitiraj broj rezultata
  constraints.push(limit(pageSize));

  return query(collectionRef, ...constraints);
};

export default buildPostsQuery;
