import {
  collection,
  query,
  orderBy,
  startAfter,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * @helper buildSavedQuery
 *
 * Kreira Firestore query za savedPosts subkolekciju datog user-a.
 *
 * - Sortira po `savedAt` u opadajucem redosledu (najnovije prvo)
 * - Paginacija preko kursora (`afterDoc`) i `limit(pageSize)`
 * - Koristi se za inicijalno ucitavanje i za "Load more"
 *
 * @param {Object} params
 * @param {string} params.uid - User ID
 * @param {DocumentSnapshot|null} [params.afterDoc=null] - Kursor za startAfter
 * @param {number} [params.pageSize=10] - Broj dokumenata po strani
 *
 * @returns {query} Firestore query objekat spreman za getDocs ili onSnapshot
 */
export function buildSavedQuery({ uid, afterDoc = null, pageSize = 10, sortDirection = "desc", }) {
  const baseRef = collection(db, "users", uid, "savedPosts");
  const parts = [orderBy("savedAt", sortDirection), limit(pageSize)];

  if (afterDoc) {
    // Ako je prosledjen kursor → dodaj startAfter
    return query(
      baseRef,
      orderBy("savedAt", sortDirection),
      startAfter(afterDoc),
      limit(pageSize)
    );
  }

  return query(baseRef, ...parts);
}
