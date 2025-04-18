/* eslint-disable */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * Firebase Cloud Function za rekurzivno brisanje komentara i svih njegovih potomaka.
 * 
 * Koristi Firestore `parentID` polje za pronalazenje hijerarhije komentara.
 * Funkcija je zasticena – samo autentifikovani korisnici mogu brisati komentare.
 *
 * @function deleteCommentAndChildren
 * @param {object} data - Objekt koji sadrzi ID komentara koji treba obrisati.
 * @param {string} data.commentId - ID korenskog komentara koji treba obrisati.
 * @param {functions.https.CallableContext} context - Kontekst poziva koji ukljucuje podatke o korisniku.
 * @returns {{ success: boolean }} - Objekat sa success flag-om ako je brisanje uspesno.
 * @throws {functions.https.HttpsError} Ako korisnik nije autentifikovan, komentar ne postoji, ili dodje do greske u brisanju.
 */
exports.deleteCommentAndChildren = functions.https.onCall(
  async (data, context) => {
    const commentId = data.commentId;

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to delete a comment."
      );
    }

    const docSnap = await db.collection("comments").doc(commentId).get();

    if (!docSnap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Comment with ID ${commentId} does not exist.`
      );
    }

    try {
      await deleteCommentBatch(commentId);
      return { success: true };
    } catch (error) {
      console.error("Error while deleting comment and its children:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while deleting the comment."
      );
    }
  }
);

/**
 * Pomocna funkcija koja rekurzivno prikuplja i brise komentar i sve njegove potomke koristeci BFS pristup.
 * 
 * Brise komentare u batch-ovima od maksimalno 500 dokumenata (Firestore ogranicenje).
 *
 * @async
 * @function deleteCommentBatch
 * @param {string} rootId - ID komentara koji se brise zajedno sa svojom decom.
 * @returns {Promise<void>} - Promis koji se resava kada je sve uspesno obrisano.
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

/**
 * Firebase Cloud Function za dodavanje komentara uz validaciju i autentifikaciju.
 *
 * Komentar moze biti glavni ili odgovor (ako je prosledjen `parentId`).
 * Sadrzaj komentara se trimuje, ogranicen je na 500 karaktera.
 * Funkcija je dostupna samo autentifikovanim korisnicima.
 *
 * @function addCommentSecure
 * @param {object} data - Podaci o komentaru.
 * @param {string} data.postId - ID posta na koji se komentar dodaje.
 * @param {string} data.content - Sadrzaj komentara.
 * @param {string|null} [data.parentId] - (Opcionalno) ID roditeljskog komentara ako je u pitanju odgovor.
 * @param {functions.https.CallableContext} context - Kontekst poziva koji sadrzi informacije o korisniku.
 * @returns {{ success: boolean, commentId: string }} - Potvrda o uspesnom dodavanju i ID komentara.
 * @throws {functions.https.HttpsError} - Ako korisnik nije autentifikovan, ako su podaci neispravni, ili ako dodavanje ne uspe.
 */

exports.addCommentSecure = functions
  .runWith({ memory: "256MB" }) // bez minInstances
  .https.onCall(async (data, context) => {
    const { postId, content, parentId = null } = data;

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be authenticated to add a comment."
      );
    }

    const trimmedContent = content?.trim();
    if (!postId || !trimmedContent) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing postId or comment content is empty."
      );
    }

    if (trimmedContent.length > 500) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Comment must not exceed 500 characters."
      );
    }

    const now = admin.firestore.Timestamp.now();
    const thirtySecondsAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 30_000);

    const recentCommentsQuery = db
      .collection("comments")
      .where("userID", "==", context.auth.uid)
      .where("timestamp", ">", thirtySecondsAgo)
      .limit(4)

    const recentCommentsSnapshot = await recentCommentsQuery.get();

    if (recentCommentsSnapshot.size >= 4) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "You're sending comments too quickly. Please try again in a few seconds."
      );
    }

    const newComment = {
      postID: postId,
      userID: context.auth.uid,
      content: trimmedContent,
      parentID: parentId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      likes: [],
    };

    try {
      const docRef = await db.collection("comments").add(newComment);
      return { success: true, commentId: docRef.id };
    } catch (error) {
      console.error("Error adding comment:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while saving the comment."
      );
    }
  });
