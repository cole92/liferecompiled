/* eslint-disable */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cloudinary = require('./cloudinary'); // Cloudinary helper konfigurisan kroz functions:config:set
const { default: context } = require('react-bootstrap/esm/AccordionContext');
const { data } = require('autoprefixer');

admin.initializeApp();
const db = admin.firestore();

/**
 * Privatna pomocna funkcija koja obavlja kompletno kaskadno brisanje posta.
 * - Brise sve komentare, reakcije i sliku ako postoji
 * - Ne koristi context.auth – mora se eksplicitno proslediti `uid`
 *
 * @param {Object} params
 * @param {string} params.postId - ID posta koji se brise
 * @param {string} params.uid - ID korisnika koji je vlasnik posta
 */

async function deletePostCascadeInternal({ postId, uid }) {
  const postRef = db.collection('posts').doc(postId);
  const postSnap = await postRef.get();

  if (!postSnap.exists) {
    throw new Error(`Post ${postId} does not exist.`);
  }

  const postData = postSnap.data();
  if (postData.userId !== uid) {
    throw new Error('Permission denied: user is not the owner of the post.');
  }

  // Brisanje komentara po postID (bez parent hijerarhije)
  let lastComment = null;
  do {
    let q = db.collection('comments')
      .where('postID', '==', postId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(500);

    if (lastComment) q = q.startAfter(lastComment);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    lastComment = snap.docs[snap.docs.length - 1];
  } while (true);

  // Brisanje reakcija
  let last = null;
  do {
    let q = db
      .collection('reactions')
      .where('postId', '==', postId)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(500);
    if (last) q = q.startAfter(last);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    last = snap.docs[snap.docs.length - 1];
  } while (true);

  // Brisanje slike sa Cloudinary ako postoji
  if (postData.imagePublicId) {
    try {
      await cloudinary.uploader.destroy(postData.imagePublicId);
    } catch (err) {
      console.warn('[Cloudinary] delete error:', err);
    }
  }

  // Na kraju brisemo post dokument
  await postRef.delete();
}


/**
 * Rekurzivno brise komentar i sve njegove potomke (koristi BFS + batcheve).
 *
 * @param {string} commentId - ID komentara koji treba obrisati
 * @returns {Promise<{ success: boolean }>}
 */

exports.deleteCommentAndChildren = functions
  .region("europe-central2")
  .https.onCall(async (data, context) => {
    const { commentId } = data || {};

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to delete a comment.');
    }

    const docSnap = await db.collection('comments').doc(commentId).get();
    if (!docSnap.exists) {
      throw new functions.https.HttpsError('not-found', `Comment with ID ${commentId} does not exist.`);
    }

    try {
      await deleteCommentBatch(commentId);
      return { success: true };
    } catch (error) {
      console.error('Error while deleting comment and its children:', error);
      throw new functions.https.HttpsError('internal', 'An error occurred while deleting the comment.');
    }
  });

/**
 * Pomocna funkcija koja rekurzivno brise sve komentare i njihove potomke.
 *
 * @param {string} rootId - ID korenskog komentara
 */

async function deleteCommentBatch(rootId) {
  const toDelete = [rootId];

  // Prikupljamo sve potomke komentara (BFS)
  for (let i = 0; i < toDelete.length; i++) {
    const parentId = toDelete[i];
    const snap = await db.collection('comments').where('parentID', '==', parentId).get();
    snap.docs.forEach((doc) => toDelete.push(doc.id));
  }

  // Brisemo u batch-ovima (max 500 dokumenata)
  while (toDelete.length) {
    const batch = db.batch();
    const chunk = toDelete.splice(0, 500);
    chunk.forEach((id) => {
      batch.delete(db.collection('comments').doc(id));
    });
    await batch.commit();
  }
}

/**
 * Soft-delete komentar → oznacava ga kao obrisan (ne brise iz baze).
 *
 * @param {string} commentId - ID komentara koji se soft-brise
 * @returns {Promise<{ success: boolean }>}
 */

exports.softDeleteComment = functions
  .region("europe-central2")
  .https.onCall(async (data, context) => {
    const { commentId } = data || {};

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to delete a comment.');
    }

    const docSnap = await db.collection('comments').doc(commentId).get();
    if (!docSnap.exists) {
      throw new functions.https.HttpsError('not-found', `Comment with ID ${commentId} does not exist.`);
    }

    const commentData = docSnap.data();
    if (commentData.userID !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'You are not authorized to delete this comment.');
    }

    await db.collection('comments').doc(commentId).update({
      deleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  });

/**
 * Dodaje novi komentar uz validaciju sadrzaja i ogranicenje brzine.
 *
 * @param {string} postId - ID posta kojem pripada komentar
 * @param {string} content - Tekst komentara
 * @param {string|null} parentId - (opciono) ID roditeljskog komentara
 * @returns {Promise<{ success: boolean, commentId: string }>}
 */

exports.addCommentSecure = functions
  .region("europe-central2")
  .runWith({ memory: '256MB' })
  .https.onCall(async (data, context) => {
    const { postId, content, parentId = null } = data || {};

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be authenticated to add a comment.');
    }

    const trimmedContent = content?.trim();
    if (!postId || !trimmedContent) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing postId or comment content is empty.');
    }

    if (trimmedContent.length > 500) {
      throw new functions.https.HttpsError('invalid-argument', 'Comment must not exceed 500 characters.');
    }

    // Rate limit: max 3 komentara u 30 sekundi
    const now = admin.firestore.Timestamp.now();
    const thirtySecondsAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 30_000);

    const recent = await db
      .collection('comments')
      .where('userID', '==', context.auth.uid)
      .where('timestamp', '>', thirtySecondsAgo)
      .limit(4)
      .get();

    if (recent.size >= 4) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        "You're sending comments too quickly. Please try again in a few seconds."
      );
    }

    const newComment = {
      postID: postId,
      userID: context.auth.uid,
      content: trimmedContent,
      parentID: parentId ?? null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      likes: [],
    };

    try {
      const docRef = await db.collection('comments').add(newComment);
      return { success: true, commentId: docRef.id };
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new functions.https.HttpsError('internal', 'An error occurred while saving the comment.');
    }
  });

/**
 * Cloud Function: Kaskadno brisanje posta i svih povezanih podataka
 */

exports.deletePostCascade = functions
  .region('europe-central2')
  .runWith({ memory: '512MB', timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You are not logged in.');
    }

    const { postId } = data || {};
    if (!postId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing postId.');
    }

    try {
      await deletePostCascadeInternal({ postId, uid: context.auth.uid });
      return { success: true };
    } catch (err) {
      console.error('deletePostCascade error:', err);
      throw new functions.https.HttpsError('internal', 'Cascade delete failed.');
    }
  });

exports.cleanupExpiredPosts = functions
  .region('europe-central2')
  .runWith({ memory: '512MB', timeoutSeconds: 120 })
  .pubsub.schedule('every 24 hours')
  .timeZone('Europe/Belgrade')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const cutoff = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 30 * 24 * 60 * 60 * 1000
    );

    const snap = await db.collection('posts')
      .where('deleted', '==', true)
      .where('deletedAt', '<=', cutoff)
      .get();

    if (snap.empty) {
      console.log(' No posts to hard-delete.');
      return null;
    }

    console.log(` Hard-deleting ${snap.size} expired post(s)…`);

    for (const doc of snap.docs) {
      const postId = doc.id;
      const authorId = doc.get('userId');
      try {
        await deletePostCascadeInternal({ postId, uid: authorId });
        console.log(` Deleted post ${postId}`);
      } catch (err) {
        console.error(`Failed to delete post ${postId}:`, err);
      }
    }

    return null;
  });

  exports.UpdateUserStatsOnPostCreate = functions
    .region("europe-central2")
    .firestore.document("posts/{postId}")
    .onCreate((snap, context) => {
      const data = snap.data();
      const userId = data.userId;
      const createdAt = data.createdAt;

      if (!userId) {
        console.warn("Post created without userId:", context.params.postId);
        return null;
      }

      const date = createdAt?.toDate ? createdAt.toDate() : new Date();
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const monthKey = `${y} - ${m}`;
      console.log("userId:", userId, "monthKey:", monthKey);
    });
    