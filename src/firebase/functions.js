// commentApi.js

// 1) Uzimamo samo httpsCallable iz Firebase SDK-a
import { httpsCallable } from "firebase/functions";

// 2) Uvozimo konfigurisan Firebase functions objekat
//    (putanja se moze razlikovati u zavisnosti od strukture projekta)
import { functions } from "../firebase";

/**
 * Poziva Cloud Function za rekurzivno brisanje komentara i svih potomaka.
 *
 * @function
 * @param {Object} data
 * @param {string} data.commentId - ID komentara koji treba obrisati
 * @returns {Promise<Object>} - Response sa `{ success: true }` ako je uspesno
 */
export const deleteComment = httpsCallable(
  functions,
  "deleteCommentAndChildren"
);

/**
 * Poziva Cloud Function za dodavanje novog komentara uz validaciju.
 *
 * @function
 * @param {Object} data
 * @param {string} data.postId - ID posta kojem komentar pripada
 * @param {string} data.content - Tekst komentara
 * @param {string|null} data.parentId - (opciono) ID roditeljskog komentara
 * @returns {Promise<Object>} - Response sa `{ success: true, commentId }`
 */
export const addCommentSecure = httpsCallable(
  functions,
  "addCommentSecure"
);
