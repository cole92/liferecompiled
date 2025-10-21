/* eslint-disable */

// -------------------- IMPORTS --------------------
const admin = require("firebase-admin");
console.log("[CF] index loaded");

// v2 core
const { setGlobalOptions } = require("firebase-functions/v2/options");
const {
  onRequest,
  onCall,
  HttpsError,
} = require("firebase-functions/v2/https");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");

// (zadrži cloudinary helper ako ti treba u produkciji)
const cloudinary = require("./cloudinary");

// -------------------- INIT --------------------
admin.initializeApp();
setGlobalOptions({ region: "europe-central2" });

const db = admin.firestore();
const isEmulator = !!process.env.FUNCTIONS_EMULATOR;

// -------------------- PING (v2) --------------------
exports.ping = onRequest((req, res) => {
  res.send("pong");
});

// -------------------- HELPERS --------------------

// Azuriranje permDelete statistike
async function bumpPermanentDeletesForUser(userId) {
  const ref = admin.firestore().collection("userStats").doc(userId);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      totalPosts: 0,
      postsPerMonth: {},
      restoredPosts: 0,
      permanentlyDeletedPosts: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    await ref.set(
      {
        permanentlyDeletedPosts: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
}

// BFS brisanje cele grane komentara
async function deleteCommentBatch(rootId) {
  const toDelete = [rootId];

  // prikupi sve potomke
  for (let i = 0; i < toDelete.length; i++) {
    const parentId = toDelete[i];
    const snap = await db
      .collection("comments")
      .where("parentID", "==", parentId)
      .get();
    snap.docs.forEach((doc) => toDelete.push(doc.id));
  }

  // batched delete (max 500)
  while (toDelete.length) {
    const batch = db.batch();
    const chunk = toDelete.splice(0, 500);
    chunk.forEach((id) => batch.delete(db.collection("comments").doc(id)));
    await batch.commit();
  }
}

// Kaskadno brisanje posta + veza
async function deletePostCascadeInternal({ postId, uid }) {
  const postRef = db.collection("posts").doc(postId);
  const postSnap = await postRef.get();

  if (!postSnap.exists) {
    throw new Error(`Post ${postId} does not exist.`);
  }

  const postData = postSnap.data();
  if (postData.userId !== uid) {
    throw new Error("Permission denied: user is not the owner of the post.");
  }

  // Fallback: FieldPath.documentId() može biti undefined u nekim setup-ima
  const docIdField = admin.firestore.FieldPath?.documentId
    ? admin.firestore.FieldPath.documentId()
    : "__name__";

  // komentari
  let lastComment = null;
  do {
    let q = db
      .collection("comments")
      .where("postID", "==", postId)
      .orderBy(docIdField)
      .limit(500);

    if (lastComment) q = q.startAfter(lastComment);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    lastComment = snap.docs[snap.docs.length - 1];
  } while (true);

  // reakcije
  let last = null;
  do {
    let q = db
      .collection("reactions")
      .where("postId", "==", postId)
      .orderBy(docIdField)
      .limit(500);
    if (last) q = q.startAfter(last);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    last = snap.docs[snap.docs.length - 1];
  } while (true);

  // cloudinary slika (best-effort)
  if (postData.imagePublicId) {
    try {
      await cloudinary.uploader.destroy(postData.imagePublicId);
    } catch (err) {
      console.warn("[Cloudinary] delete error:", err);
    }
  }

  // na kraju obrisi sam post
  await postRef.delete();

  // stat bump tek kada je post stvarno obrisan (azuriranje perm delete stats)
  await bumpPermanentDeletesForUser(uid);
}

// -------------------- HTTPS onCall (v2) --------------------

// deletePostCascade (v2)
exports.deletePostCascade = onCall(
  { memory: "512MiB", timeoutSeconds: 120 },
  async (req) => {
    if (!req.auth)
      throw new HttpsError("unauthenticated", "You are not logged in.");
    const { postId } = req.data || {};
    if (!postId) throw new HttpsError("invalid-argument", "Missing postId.");
    await deletePostCascadeInternal({ postId, uid: req.auth.uid });
    return { success: true };
  }
);

// deleteCommentAndChildren (v2)
exports.deleteCommentAndChildren = onCall(async (req) => {
  if (!req.auth)
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to delete a comment."
    );
  const { commentId } = req.data || {};
  if (!commentId)
    throw new HttpsError("invalid-argument", "Missing commentId.");

  const docSnap = await db.collection("comments").doc(commentId).get();
  if (!docSnap.exists)
    throw new HttpsError("not-found", `Comment ${commentId} does not exist.`);

  try {
    await deleteCommentBatch(commentId);
    return { success: true };
  } catch (err) {
    console.error("Error while deleting comment and its children:", err);
    throw new HttpsError(
      "internal",
      "An error occurred while deleting the comment."
    );
  }
});

// softDeleteComment (v2)
exports.softDeleteComment = onCall(async (req) => {
  if (!req.auth)
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to delete a comment."
    );
  const { commentId } = req.data || {};
  if (!commentId)
    throw new HttpsError("invalid-argument", "Missing commentId.");

  const docRef = db.collection("comments").doc(commentId);
  const docSnap = await docRef.get();
  if (!docSnap.exists)
    throw new HttpsError("not-found", `Comment ${commentId} does not exist.`);

  const commentData = docSnap.data();
  if (commentData.userID !== req.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "You are not authorized to delete this comment."
    );
  }

  await docRef.update({
    deleted: true,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

// addCommentSecure (v2)
exports.addCommentSecure = onCall({ memory: "256MiB" }, async (req) => {
  if (!req.auth)
    throw new HttpsError(
      "unauthenticated",
      "You must be authenticated to add a comment."
    );

  const { postId, content, parentId = null } = req.data || {};
  const trimmedContent = content?.trim();

  if (!postId || !trimmedContent) {
    throw new HttpsError(
      "invalid-argument",
      "Missing postId or comment content is empty."
    );
  }

  if (trimmedContent.length > 500) {
    throw new HttpsError(
      "invalid-argument",
      "Comment must not exceed 500 characters."
    );
  }

  // Rate limit: max 3 komentara u 30 sekundi
  const now = admin.firestore.Timestamp.now();
  const thirtySecondsAgo = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - 30_000
  );

  const recent = await db
    .collection("comments")
    .where("userID", "==", req.auth.uid)
    .where("timestamp", ">", thirtySecondsAgo)
    .limit(4)
    .get();

  if (recent.size >= 4) {
    throw new HttpsError(
      "resource-exhausted",
      "You are sending comments too quickly. Try again in a few seconds."
    );
  }

  const newComment = {
    postID: postId,
    userID: req.auth.uid,
    content: trimmedContent,
    parentID: parentId ?? null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    likes: [],
  };

  try {
    const docRef = await db.collection("comments").add(newComment);
    return { success: true, commentId: docRef.id };
  } catch (error) {
    console.error("Error adding comment:", error);
    throw new HttpsError(
      "internal",
      "An error occurred while saving the comment."
    );
  }
});

// -------------------- FIRESTORE TRIGGER: onCreate (v2) --------------------
exports.updateUserStatsOnPostCreateV2 = onDocumentCreated(
  "posts/{postId}",
  async (event) => {
    const data = event.data?.data();
    const userId = data?.userId;
    const createdAt = data?.createdAt;
    if (!userId) return;

    // monthKey = "YYYY-MM"
    const d = createdAt?.toDate ? createdAt.toDate() : new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const monthKey = `${y}-${m}`;

    const ref = db.collection("userStats").doc(userId);
    const snap = await ref.get();

    if (!snap.exists) {
      // prvi put – kreiramo dokument i setujemo createdAt SAMO sada
      await ref.set({
        totalPosts: 1,
        postsPerMonth: { [monthKey]: 1 },
        restoredPosts: 0,
        permanentlyDeletedPosts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // samo prvi put
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // sledeći put – samo inkrementi i updatedAt (createdAt ostaje netaknut)
      await ref.set(
        {
          totalPosts: admin.firestore.FieldValue.increment(1),
          [`postsPerMonth.${monthKey}`]:
            admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    console.log("[v2] stats bumped for", userId, "month", monthKey);
  }
);

// On restore

exports.bumpRestoredOnPostUpdate = onDocumentUpdated(
  "posts/{postId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    const wasDeleted = before.deleted === true;
    const isDeleted = after.deleted === true;
    if (!(wasDeleted && !isDeleted)) return; // samo restore

    const userId = after.userId;
    if (!userId) return;

    const ref = db.collection("userStats").doc(userId);
    const snap = await ref.get();

    if (!snap.exists) {
      // prvi put nastaje userStats kroz RESTORE → setuj createdAt
      await ref.set({
        restoredPosts: 1,
        totalPosts: 0,
        permanentlyDeletedPosts: 0,
        postsPerMonth: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await ref.set(
        {
          restoredPosts: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    console.log("[v2] restore++ for", userId, "post", event.params.postId);
  }
);

// -------------------- SCHEDULER (v2) --------------------
exports.cleanupExpiredPostsV2 = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "Europe/Belgrade",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const cutoff = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 30 * 24 * 60 * 60 * 1000
    );

    const snap = await db
      .collection("posts")
      .where("deleted", "==", true)
      .where("deletedAt", "<=", cutoff)
      .get();

    if (snap.empty) {
      console.log("No posts to hard-delete.");
      return null;
    }

    console.log(`Hard-deleting ${snap.size} expired post(s)…`);

    for (const doc of snap.docs) {
      const postId = doc.id;
      const authorId = doc.get("userId");
      try {
        await deletePostCascadeInternal({ postId, uid: authorId });
        console.log(`Deleted post ${postId}`);
      } catch (err) {
        console.error(`Failed to delete post ${postId}:`, err);
      }
    }

    return null;
  }
);
