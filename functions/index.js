/* eslint-disable */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

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
      console.error("Greška prilikom brisanja komentara i dece:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Došlo je do greške prilikom brisanja komentara."
      );
    }
  }
);

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
