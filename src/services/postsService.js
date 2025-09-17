// services/postsService.js
import {
  collection,
  query,
  where,
  orderBy,
  startAfter,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * @helper buildPostsQuery
 *
 * Kreira Firestore upit za listanje postova korisnika sa podrskom za filtere i paginaciju.
 *
 * - Obavezno filtrira po autoru (`userId`) i ignorise obrisane (`deleted:false`)
 * - Sortira po datumu kreiranja (najnoviji prvi)
 * - Filter "active" prikazuje samo otkljucane postove
 * - Filter "locked" prikazuje samo zakljucane postove
 * - `afterDoc` omogucava paginaciju (startAfter kursor)
 * - `pageSize` kontrolise limit (default 10)
 *
 * @param {Object} options
 * @param {string} options.userId - ID korisnika ciji se postovi prikazuju
 * @param {"all"|"active"|"locked"} options.filter - Aktivni filter
 * @param {DocumentSnapshot|null} [options.afterDoc=null] - Kursor za paginaciju
 * @param {number} [options.pageSize=10] - Broj postova po strani
 *
 * @returns {query} Firestore Query objekat spreman za `getDocs` ili `onSnapshot`
 */
const buildPostsQuery = ({
  userId,
  filter,
  afterDoc = null,
  pageSize = 10,
}) => {
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

  return query(collection(db, "posts"), ...constraints);
};

export default buildPostsQuery;
