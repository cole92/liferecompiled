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
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");

// Cloudinary helper je opcion (best-effort). Ako fali config ili modul — ne ruši ceo container.
let cloudinary = { uploader: { destroy: async () => {} } };
try {
  // samo ako postoji i moze da se ucita
  // (ako baca zbog env var ili paketa, ostaje stub iznad)
  cloudinary = require("./cloudinary");
  console.log("[CF] cloudinary helper loaded");
} catch (e) {
  console.warn("[CF] cloudinary helper NOT loaded (using stub):", e?.message);
}

// -------------------- INIT --------------------
admin.initializeApp();
setGlobalOptions({ region: "europe-central2" });

const db = admin.firestore();
//const isEmulator = !!process.env.FUNCTIONS_EMULATOR;

// -------------------- PING (v2) --------------------
exports.ping = onRequest({ invoker: "public" }, (req, res) => {
  res.send("pong");
});

// -------------------- HELPERS --------------------

// Azuriranje permDelete statistike
async function bumpPermanentDeletesForUser(userId) {
  try {
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

    console.log("[ok] permDelete++", { userId });
  } catch (err) {
    console.error("[err] bumpPermanentDeletesForUser", {
      userId,
      message: err?.message,
      stack: err?.stack,
    });
    throw err;
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
    // bolje HttpsError nego cist Error
    throw new HttpsError("not-found", `Post ${postId} does not exist.`);
  }

  const postData = postSnap.data();

  // 1) Ucitamo user dokument da proverimo rolu
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  const role = userSnap.exists ? userSnap.data().role : "user";
  const isAuthor = postData.userId === uid;
  const isAdmin = role === "admin";

  // 2) Author ili admin mogu da prodju, ostali dobijaju permission-denied
  if (!isAuthor && !isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "You are not allowed to delete this post."
    );
  }

  // Fallback: FieldPath.documentId() moze biti undefined u nekim setup-ima
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
  try {
    await bumpPermanentDeletesForUser(uid);
  } catch (err) {
    console.error("[warn] post deleted, but stat bump failed", {
      postId,
      userId: uid,
      message: err?.message,
    });
  }
}

// -------------------- ReactionThresholds helper and fallback --------------------
const REACTION_THRESHOLDS_FALLBACK = Object.freeze({
  idea: 5,
  hot: 10,
  powerup: 30,
});

async function getReactionThresholds() {
  const ref = db.collection("appSettings").doc("reactionThresholds");

  // Validates one threshold value and falls back if invalid
  const normalize = (value, key) => {
    const fallback = REACTION_THRESHOLDS_FALLBACK[key];

    // Must be a finite number
    if (!Number.isFinite(value)) {
      console.warn(
        "[warn] reactionThreshold invalid (not finite), using fallback",
        {
          key,
          value,
          fallback,
        }
      );
      return fallback;
    }

    // Must be > 0 to avoid always-true badge logic
    if (value <= 0) {
      console.warn("[warn] reactionThreshold invalid (<= 0), using fallback", {
        key,
        value,
        fallback,
      });
      return fallback;
    }

    // Optional strictness: thresholds should be integers
    if (!Number.isInteger(value)) {
      console.warn(
        "[warn] reactionThreshold invalid (not integer), using fallback",
        {
          key,
          value,
          fallback,
        }
      );
      return fallback;
    }

    return value;
  };

  try {
    const snap = await ref.get();

    if (!snap.exists) {
      console.warn("[warn] reactionThresholds doc missing, using fallback", {
        fallback: REACTION_THRESHOLDS_FALLBACK,
      });
      return { ...REACTION_THRESHOLDS_FALLBACK };
    }

    const data = snap.data() || {};

    return {
      idea: normalize(data.idea, "idea"),
      hot: normalize(data.hot, "hot"),
      powerup: normalize(data.powerup, "powerup"),
    };
  } catch (err) {
    console.error("[err] getReactionThresholds failed, using fallback", {
      message: err?.message,
      stack: err?.stack,
      fallback: REACTION_THRESHOLDS_FALLBACK,
    });
    return { ...REACTION_THRESHOLDS_FALLBACK };
  }
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
  const uid = req.auth.uid;

  // Author check
  const isAuthor = commentData.userID === uid;

  // Admin check
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const role = userSnap.exists ? userSnap.data().role : "user";
  const isAdmin = role === "admin";

  if (!isAuthor && !isAdmin) {
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
    try {
      const data = event.data?.data();
      const userId = data?.userId;
      const createdAt = data?.createdAt;
      if (!userId) return;

      // monthKey = "YYYY-MM"
      // Ako nema createdAt, fallback je new Date()
      const d = createdAt?.toDate ? createdAt.toDate() : new Date();
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const monthKey = `${y}-${m}`;

      const statsRef = db.collection("userStats").doc(userId);
      const markerRef = db.collection("processedEvents").doc(event.id);

      await db.runTransaction(async (tx) => {
        // Idempotency marker: ako postoji, prekidamo
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        const statsSnap = await tx.get(statsRef);

        if (!statsSnap.exists) {
          // Prvo kreiranje stats dokumenta
          tx.set(statsRef, {
            totalPosts: 1,
            postsPerMonth: { [monthKey]: 1 },
            restoredPosts: 0,
            permanentlyDeletedPosts: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // 1) Globalni inkrementi
          tx.update(statsRef, {
            totalPosts: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          // 2) Siguran inkrement u mapi preko merge objekta
          tx.set(
            statsRef,
            {
              postsPerMonth: {
                [monthKey]: admin.firestore.FieldValue.increment(1),
              },
            },
            { merge: true }
          );
        }

        tx.set(markerRef, {
          type: "posts.onCreate",
          postId: event.params.postId,
          userId,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          ),
        });
      });

      console.log("[ok] onCreate", {
        eventId: event.id,
        userId,
        postId: event.params.postId,
        monthKey,
      });
    } catch (err) {
      console.error("[err] updateUserStatsOnPostCreateV2", {
        eventId: event.id,
        message: err?.message,
        stack: err?.stack,
      });
      return null;
    }
  }
);

// On restore

exports.bumpRestoredOnPostUpdate = onDocumentUpdated(
  "posts/{postId}",
  async (event) => {
    try {
      const before = event.data?.before?.data();
      const after = event.data?.after?.data();
      if (!before || !after) return;

      const wasDeleted = before.deleted === true;
      const isDeleted = after.deleted === true;
      if (!(wasDeleted && !isDeleted)) return; // samo restore

      const userId = after.userId;
      if (!userId) return;

      const statsRef = db.collection("userStats").doc(userId);
      const markerRef = db.collection("processedEvents").doc(event.id);

      await db.runTransaction(async (tx) => {
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return; // već obrađeno

        const statsSnap = await tx.get(statsRef);
        if (!statsSnap.exists) {
          tx.set(statsRef, {
            totalPosts: 0,
            postsPerMonth: {},
            restoredPosts: 1,
            permanentlyDeletedPosts: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          tx.set(
            statsRef,
            {
              restoredPosts: admin.firestore.FieldValue.increment(1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        tx.set(markerRef, {
          type: "posts.onUpdate.restore",
          postId: event.params.postId,
          userId,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          ),
        });
      });

      console.log("[ok] bumpRestoredOnPostUpdate", {
        eventId: event.id,
        userId,
        postId: event.params.postId,
      });
    } catch (err) {
      console.error("[err] bumpRestoredOnPostUpdateV2", {
        eventId: event.id,
        message: err?.message,
        stack: err?.stack,
      });
      return null;
    }
  }
);

// -------------------- FIRESTORE TRIGGER: reactions.idea.onCreate (v2) --------------------
exports.reactionsIdeaOnCreateV2 = onDocumentCreated(
  "reactions/{reactionId}",
  async (event) => {
    try {
      const data = event.data?.data();

      const postId = data?.postId;
      const reactionType = data?.reactionType;

      // Guard: nije nas tip ili fali postId
      if (!postId || reactionType !== "idea") return;

      // refs
      const postRef = db.collection("posts").doc(postId);

      // Idempotency marker treba da bude vezan za REACTION DOC ID (ne za event.id)
      const reactionId = event.params.reactionId; // dolazi iz "reactions/{reactionId}"
      const markerId = `reactions.idea.onCreate__${reactionId}`;
      const markerRef = db.collection("processedEvents").doc(markerId);

      // Thresholds (helper)
      const { idea: ideaThreshold } = await getReactionThresholds();

      await db.runTransaction(async (tx) => {
        // Idempotency: ako marker postoji, vec smo obradili ovu reakciju
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        const postSnap = await tx.get(postRef);

        // Edge: post ne postoji (obrisan / invalid reference)
        if (!postSnap.exists) {
          console.warn("[warn] reactions.idea.onCreate: post missing", {
            eventId: event.id,
            reactionId,
            postId,
          });

          // Zatvaramo marker da retry/dupli delivery ne spamuje i ne pokusava opet
          tx.set(markerRef, {
            type: "reactions.idea.onCreate",
            postId,
            reactionId,
            reactionType,
            eventId: event.id, // debug
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            ),
          });

          return;
        }

        const postData = postSnap.data() || {};
        const current = postData.reactionCounts?.idea ?? 0;
        const next = current + 1;

        // Dot-notation update: cuva ostale kljuceve u reactionCounts/badges mapama
        tx.update(postRef, {
          "reactionCounts.idea": next,
          "badges.mostInspiring": next >= ideaThreshold,
        });

        // Marker se upisuje tek POSLE update-a, u istoj transakciji
        tx.set(markerRef, {
          type: "reactions.idea.onCreate",
          postId,
          reactionId,
          reactionType,
          eventId: event.id, // debug
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          ),
        });
      });

      console.log("[ok] reactions.idea.onCreate", {
        eventId: event.id,
        reactionId,
        postId,
      });

      return;
    } catch (err) {
      console.error("[err] reactionsIdeaOnCreateV2", {
        eventId: event?.id,
        reactionId: event?.params?.reactionId,
        message: err?.message,
        stack: err?.stack,
      });

      // Vazno: bacamo error da platforma moze da retry-uje transient failure
      throw err;
    }
  }
);
// -------------------- FIRESTORE TRIGGER: reactions.idea.onDelete (v2) --------------------
exports.reactionsIdeaOnDeleteV2 = onDocumentDeleted(
  "reactions/{reactionId}",
  async (event) => {
    try {
      const data = event.data?.data();
      const postId = data?.postId;
      const reactionType = data?.reactionType;

      if (!postId || reactionType !== "idea") return;

      const postRef = db.collection("posts").doc(postId);

      // Idempotency marker
      const reactionId = event.params.reactionId;
      const markerId = `reactions.idea.onDelete__${reactionId}`;
      const markerRef = db.collection("processedEvents").doc(markerId);

      // Thresholds (helper)
      const { idea: ideaThreshold } = await getReactionThresholds();

      await db.runTransaction(async (tx) => {
        // Idempotency: ako marker postoji, vec smo obradili ovu reakciju
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        const postSnap = await tx.get(postRef);

        // Edge: post ne postoji (obrisan / invalid reference)
        if (!postSnap.exists) {
          console.warn("[warn] reactions.idea.onDelete: post missing", {
            eventId: event.id,
            reactionId,
            postId,
          });

          // Zatvaramo marker da retry/dupli delivery ne spamuje i ne pokusava opet
          tx.set(markerRef, {
            type: "reactions.idea.onDelete",
            postId,
            reactionId,
            reactionType,
            eventId: event.id, // debug
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            ),
          });

          return;
        }

        const postData = postSnap.data() || {};
        const current = postData.reactionCounts?.idea ?? 0;
        const next = Math.max(current - 1, 0);

        tx.update(postRef, {
          "reactionCounts.idea": next,
          "badges.mostInspiring": next >= ideaThreshold,
        });

        tx.set(markerRef, {
          type: "reactions.idea.onDelete",
          postId,
          reactionId,
          reactionType,
          eventId: event.id, // debug
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          ),
        });
      });

      console.log("[ok] reactions.idea.onDelete", {
        eventId: event.id,
        reactionId,
        postId,
      });

      return;
    } catch (err) {
      console.error("[err] reactionsIdeaOnDeleteV2", {
        eventId: event?.id,
        reactionId: event?.params?.reactionId,
        message: err?.message,
        stack: err?.stack,
      });

      throw err;
    }
  }
);

// -------------------- FIRESTORE TRIGGER: reactions.hot.onCreate (v2) --------------------

exports.reactionsHotOnCreateV2 = onDocumentCreated(
  "reactions/{reactionId}",
  async (event) => {
    try {
      const data = event.data?.data();
      const postId = data?.postId;
      const reactionType = data?.reactionType;

      if (!postId || reactionType !== "hot") return;

      const postRef = db.collection("posts").doc(postId);

      // Idempotency marker
      const reactionId = event.params.reactionId;
      const markerId = `reactions.hot.onCreate__${reactionId}`;
      const markerRef = db.collection("processedEvents").doc(markerId);

      // Thresholds (helper)
      const { hot: hotThreshold } = await getReactionThresholds();

      await db.runTransaction(async (tx) => {
        // Idempotency: ako marker postoji, vec smo obradili ovu reakciju
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        const postSnap = await tx.get(postRef);

        // Edge: post ne postoji (obrisan / invalid reference)
        if (!postSnap.exists) {
          console.warn("[warn] reactions.hot.onCreate: post missing", {
            eventId: event.id,
            reactionId,
            postId,
          });

          // Zatvaramo marker da retry/dupli delivery ne spamuje i ne pokusava opet
          tx.set(markerRef, {
            type: "reactions.hot.onCreate",
            postId,
            reactionId,
            reactionType,
            eventId: event.id, // debug
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            ),
          });

          return;
        }

        const postData = postSnap.data() || {};
        const current = postData.reactionCounts?.hot ?? 0;
        const next = current + 1;

        // Dot-notation update: cuva ostale kljuceve u reactionCounts/badges mapama
        tx.update(postRef, {
          "reactionCounts.hot": next,
          lastHotAt: admin.firestore.FieldValue.serverTimestamp(),
          "badges.trending": next >= hotThreshold,
        });
        // Marker se upisuje tek POSLE update-a, u istoj transakciji
        tx.set(markerRef, {
          type: "reactions.hot.onCreate",
          postId,
          reactionId,
          reactionType,
          eventId: event.id, // debug
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          ),
        });
      });

      console.log("[ok] reactions.hot.onCreate", {
        eventId: event.id,
        reactionId,
        postId,
      });
      return;
    } catch (err) {
      console.error("[err] reactionsHotOnCreateV2", {
        eventId: event?.id,
        reactionId: event?.params?.reactionId,
        message: err?.message,
        stack: err?.stack,
      });

      // Vazno: bacamo error da platforma moze da retry-uje transient failure
      throw err;
    }
  }
);

// -------------------- FIRESTORE TRIGGER: reactions.hot.onDelete (v2) --------------------

exports.reactionsHotOnDeleteV2 = onDocumentDeleted(
  "reactions/{reactionId}",
  async (event) => {
    try {
      const data = event.data?.data();
      const postId = data?.postId;
      const reactionType = data?.reactionType;

      if (!postId || reactionType !== "hot") return;

      const postRef = db.collection("posts").doc(postId);

      // Idempotency marker
      const reactionId = event.params.reactionId;
      const markerId = `reactions.hot.onDelete__${reactionId}`;
      const markerRef = db.collection("processedEvents").doc(markerId);

      // Thresholds (helper)
      const { hot: hotThreshold } = await getReactionThresholds();

      await db.runTransaction(async (tx) => {
        // Idempotency: ako marker postoji, vec smo obradili ovu reakciju
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        const postSnap = await tx.get(postRef);

        // Edge: post ne postoji (obrisan / invalid reference)
        if (!postSnap.exists) {
          console.warn("[warn] reactions.hot.onDelete: post missing", {
            eventId: event.id,
            reactionId,
            postId,
          });

          // Zatvaramo marker da retry/dupli delivery ne spamuje i ne pokusava opet
          tx.set(markerRef, {
            type: "reactions.hot.onDelete",
            postId,
            reactionId,
            reactionType,
            eventId: event.id, // debug
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            ),
          });

          return;
        }

        const postData = postSnap.data() || {};
        const current = postData.reactionCounts?.hot ?? 0;
        const next = Math.max(current - 1, 0);

        const update = {
          "reactionCounts.hot": next,
        };

        // COUNT pravilo: cim padne ispod praga, trending se gasi odmah
        if (next < hotThreshold) {
          update["badges.trending"] = false;
        }

        tx.update(postRef, update);

        tx.set(markerRef, {
          type: "reactions.hot.onDelete",
          postId,
          reactionId,
          reactionType,
          eventId: event.id, // debug
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          ),
        });
      });

      console.log("[ok] reactions.hot.onDelete", {
        eventId: event.id,
        reactionId,
        postId,
      });

      return;
    } catch (err) {
      console.error("[err] reactionsHotOnDeleteV2", {
        eventId: event?.id,
        reactionId: event?.params?.reactionId,
        message: err?.message,
        stack: err?.stack,
      });

      throw err;
    }
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
