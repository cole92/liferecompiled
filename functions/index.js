/* eslint-disable */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * Firebase Cloud Function za rekurzivno brisanje komentara i svih njegovih potomaka.
 * 
 * Koristi Firestore `parentID` polje za pronalaženje hijerarhije komentara.
 * Funkcija je zaštićena – samo autentifikovani korisnici mogu brisati komentare.
 *
 * @function deleteCommentAndChildren
 * @param {object} data - Objekt koji sadrži ID komentara koji treba obrisati.
 * @param {string} data.commentId - ID korenskog komentara koji treba obrisati.
 * @param {functions.https.CallableContext} context - Kontekst poziva koji uključuje podatke o korisniku.
 * @returns {{ success: boolean }} - Objekat sa success flag-om ako je brisanje uspešno.
 * @throws {functions.https.HttpsError} Ako korisnik nije autentifikovan, komentar ne postoji, ili dođe do greške u brisanju.
 */
exports.deleteCommentAndChildren = functions.https.onCall(
  async (data, context) => {
    const commentId = data.commentId;

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Morate biti prijavljeni da biste obrisali komentar."
      );
    }

    const docSnap = await db.collection("comments").doc(commentId).get();

    if (!docSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Komentar sa ID ${commentId} ne postoji.`
      );
    }

    try {
      await deleteCommentBatch(commentId);
      return { success: true };
    } catch (error) {
      console.error("Greska prilikom brisanja komentara i dece:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Doslo je do greske prilikom brisanja komentara."
      );
    }
  }
);

/**
 * Pomoćna funkcija koja rekurzivno prikuplja i briše komentar i sve njegove potomke koristeći BFS pristup.
 * 
 * Briše komentare u batch-ovima od maksimalno 500 dokumenata (Firestore ograničenje).
 *
 * @async
 * @function deleteCommentBatch
 * @param {string} rootId - ID komentara koji se briše zajedno sa svojom decom.
 * @returns {Promise<void>} - Promis koji se rešava kada je sve uspešno obrisano.
 */
async function deleteCommentBatch(rootId) {
  const toDelete = [rootId];

  for (let i = 0; i < toDelete.length; i++) {
    const parentId = toDelete[i];
    const snap = await db
      .collection("comments")
      .where("parentID", "==", parentId)
      .get();

    snap.docs.forEach((doc) => toDelete.push(doc.id));
  }

  while (toDelete.length) {
    const batch = db.batch();
    const chunk = toDelete.splice(0, 500);

    chunk.forEach((id) => {
      batch.delete(db.collection("comments").doc(id));
    });

    await batch.commit();
  }
}
