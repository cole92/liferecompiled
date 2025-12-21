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
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
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
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await ref.set(
        {
          permanentlyDeletedPosts: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
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
    throw new HttpsError("not-found", `Post ${postId} does not exist.`);
  }

  const postData = postSnap.data() || {};
  const authorId = postData.userId;

  if (!authorId) {
    throw new HttpsError(
      "failed-precondition",
      "Post is missing author userId."
    );
  }

  // 1) Ucitamo user dokument da proverimo rolu
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  const role = userSnap.exists ? userSnap.data().role : "user";
  const isAuthor = authorId === uid;
  const isAdmin = role === "admin";

  // 2) Author ili admin mogu da prodju
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

  // 3) Reakcije PRVO (da onDelete CF ima vece sanse da ucita post dok jos postoji)
  let lastReaction = null;
  do {
    let q = db
      .collection("reactions")
      .where("postId", "==", postId)
      .orderBy(docIdField)
      .limit(500);

    if (lastReaction) q = q.startAfter(lastReaction);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    lastReaction = snap.docs[snap.docs.length - 1];
  } while (true);

  // 4) Komentari
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

  // 5) Cloudinary slika (best-effort)
  if (postData.imagePublicId) {
    try {
      await cloudinary.uploader.destroy(postData.imagePublicId);
    } catch (err) {
      console.warn("[Cloudinary] delete error:", err?.message);
    }
  }

  // 6) Na kraju obrisi sam post
  await postRef.delete();

  // 7) Stat bump treba da ide AUTORU posta (ne adminu koji je kliknuo delete)
  try {
    await bumpPermanentDeletesForUser(authorId);
  } catch (err) {
    console.error("[warn] post deleted, but stat bump failed", {
      postId,
      authorId,
      requestorId: uid,
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
    deletedAt: FieldValue.serverTimestamp(),
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
  const now = Timestamp.now();
  const thirtySecondsAgo = Timestamp.fromMillis(now.toMillis() - 30_000);

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
    timestamp: FieldValue.serverTimestamp(),
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
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          // 1) Globalni inkrementi
          tx.update(statsRef, {
            totalPosts: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          });
          // 2) Siguran inkrement u mapi preko merge objekta
          tx.set(
            statsRef,
            {
              postsPerMonth: {
                [monthKey]: FieldValue.increment(1),
              },
            },
            { merge: true }
          );
        }

        tx.set(markerRef, {
          type: "posts.onCreate",
          postId: event.params.postId,
          userId,
          processedAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromDate(
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
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          tx.set(
            statsRef,
            {
              restoredPosts: FieldValue.increment(1),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        tx.set(markerRef, {
          type: "posts.onUpdate.restore",
          postId: event.params.postId,
          userId,
          processedAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromDate(
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
      const data = event.data?.data() || {};

      const postId = data?.postId;
      const reactionType = data?.reactionType;

      // Guard: only idea + must have postId
      if (!postId || reactionType !== "idea") return null;

      const reactionId = event.params.reactionId;
      const eventId = event?.id;

      // If eventId is missing, we cannot guarantee idempotency safely
      if (!eventId) {
        console.warn("[warn] reactions.idea.onCreate: missing event.id", {
          reactionId,
          postId,
        });
        return null;
      }

      const postRef = db.collection("posts").doc(postId);

      // Idempotency marker MUST be bound to eventId (works with deterministic reactionId toggle)
      const markerId = `reactions.idea.onCreate__${eventId}`;
      const markerRef = db.collection("processedEvents").doc(markerId);

      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      // Thresholds (helper)
      const { idea: ideaThreshold } = await getReactionThresholds();

      await db.runTransaction(async (tx) => {
        // Idempotency: same event retries are ignored
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        const postSnap = await tx.get(postRef);

        // Edge: post missing (deleted / invalid ref)
        if (!postSnap.exists) {
          console.warn("[warn] reactions.idea.onCreate: post missing", {
            eventId,
            reactionId,
            postId,
          });

          tx.set(markerRef, {
            type: "reactions.idea.onCreate",
            status: "skipped",
            reason: "post_missing",
            postId,
            reactionId,
            reactionType,
            eventId,
            processedAt: FieldValue.serverTimestamp(),
            expiresAt,
          });

          return;
        }

        const postData = postSnap.data() || {};
        const current = postData?.reactionCounts?.idea ?? 0;
        const next = current + 1;

        // Keep other keys in nested maps via dot-notation
        tx.update(postRef, {
          "reactionCounts.idea": next,
          "badges.mostInspiring": next >= ideaThreshold,
        });

        // Marker written after updates (same transaction)
        tx.set(markerRef, {
          type: "reactions.idea.onCreate",
          status: "applied",
          reason: null,
          postId,
          reactionId,
          reactionType,
          eventId,
          processedAt: FieldValue.serverTimestamp(),
          expiresAt,
        });
      });

      console.log("[ok] reactions.idea.onCreate", {
        eventId,
        reactionId,
        postId,
      });
      return null;
    } catch (err) {
      console.error("[err] reactionsIdeaOnCreateV2", {
        eventId: event?.id ?? null,
        reactionId: event?.params?.reactionId ?? null,
        message: err?.message,
        stack: err?.stack,
      });
      throw err;
    }
  }
);

// -------------------- FIRESTORE TRIGGER: reactions.idea.onDelete (v2) --------------------
exports.reactionsIdeaOnDeleteV2 = onDocumentDeleted(
  "reactions/{reactionId}",
  async (event) => {
    try {
      const data = event.data?.data() || {};
      const postId = data?.postId;
      const reactionType = data?.reactionType;

      // Guard: only idea + must have postId
      if (!postId || reactionType !== "idea") return null;

      const reactionId = event.params.reactionId;
      const eventId = event?.id;

      // If eventId is missing, we cannot guarantee idempotency safely
      if (!eventId) {
        console.warn("[warn] reactions.idea.onDelete: missing event.id", {
          reactionId,
          postId,
        });
        return null;
      }

      const postRef = db.collection("posts").doc(postId);

      // Idempotency marker MUST be bound to eventId (works with deterministic reactionId toggle)
      const markerId = `reactions.idea.onDelete__${eventId}`;
      const markerRef = db.collection("processedEvents").doc(markerId);

      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      // Thresholds (helper)
      const { idea: ideaThreshold } = await getReactionThresholds();

      await db.runTransaction(async (tx) => {
        // Idempotency: same event retries are ignored
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        const postSnap = await tx.get(postRef);

        // Edge: post missing (deleted / invalid ref)
        if (!postSnap.exists) {
          console.warn("[warn] reactions.idea.onDelete: post missing", {
            eventId,
            reactionId,
            postId,
          });

          tx.set(markerRef, {
            type: "reactions.idea.onDelete",
            status: "skipped",
            reason: "post_missing",
            postId,
            reactionId,
            reactionType,
            eventId,
            processedAt: FieldValue.serverTimestamp(),
            expiresAt,
          });

          return;
        }

        const postData = postSnap.data() || {};
        const current = postData?.reactionCounts?.idea ?? 0;
        const next = Math.max(current - 1, 0);

        tx.update(postRef, {
          "reactionCounts.idea": next,
          "badges.mostInspiring": next >= ideaThreshold,
        });

        // Marker written after updates (same transaction)
        tx.set(markerRef, {
          type: "reactions.idea.onDelete",
          status: "applied",
          reason: null,
          postId,
          reactionId,
          reactionType,
          eventId,
          processedAt: FieldValue.serverTimestamp(),
          expiresAt,
        });
      });

      console.log("[ok] reactions.idea.onDelete", {
        eventId,
        reactionId,
        postId,
      });
      return null;
    } catch (err) {
      console.error("[err] reactionsIdeaOnDeleteV2", {
        eventId: event?.id ?? null,
        reactionId: event?.params?.reactionId ?? null,
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
      const data = event.data?.data() || {};
      const postId = data?.postId;
      const reactionType = data?.reactionType;

      // Guard: only hot + must have postId
      if (!postId || reactionType !== "hot") return null;

      const reactionId = event.params.reactionId;
      const eventId = event?.id;

      // If eventId is missing, we cannot guarantee idempotency safely
      if (!eventId) {
        console.warn("[warn] reactions.hot.onCreate: missing event.id", {
          reactionId,
          postId,
        });
        return null;
      }

      const postRef = db.collection("posts").doc(postId);

      // Idempotency marker MUST be bound to eventId (works with deterministic reactionId toggle)
      const markerId = `reactions.hot.onCreate__${eventId}`;
      const markerRef = db.collection("processedEvents").doc(markerId);

      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      // Thresholds (helper)
      const { hot: hotThreshold } = await getReactionThresholds();

      await db.runTransaction(async (tx) => {
        // Idempotency: same event retries are ignored
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        const postSnap = await tx.get(postRef);

        // Edge: post missing (deleted / invalid ref)
        if (!postSnap.exists) {
          console.warn("[warn] reactions.hot.onCreate: post missing", {
            eventId,
            reactionId,
            postId,
          });

          tx.set(markerRef, {
            type: "reactions.hot.onCreate",
            status: "skipped",
            reason: "post_missing",
            postId,
            reactionId,
            reactionType,
            eventId,
            processedAt: FieldValue.serverTimestamp(),
            expiresAt,
          });

          return;
        }

        const postData = postSnap.data() || {};
        const current = postData?.reactionCounts?.hot ?? 0;
        const next = current + 1;

        // Update aggregates
        tx.update(postRef, {
          "reactionCounts.hot": next,
          lastHotAt: FieldValue.serverTimestamp(),
          "badges.trending": next >= hotThreshold,
        });

        // Marker written after updates (same transaction)
        tx.set(markerRef, {
          type: "reactions.hot.onCreate",
          status: "applied",
          reason: null,
          postId,
          reactionId,
          reactionType,
          eventId,
          processedAt: FieldValue.serverTimestamp(),
          expiresAt,
        });
      });

      console.log("[ok] reactions.hot.onCreate", {
        eventId,
        reactionId,
        postId,
      });
      return null;
    } catch (err) {
      console.error("[err] reactionsHotOnCreateV2", {
        eventId: event?.id ?? null,
        reactionId: event?.params?.reactionId ?? null,
        message: err?.message,
        stack: err?.stack,
      });

      throw err; // transient failure -> retry
    }
  }
);

// -------------------- FIRESTORE TRIGGER: reactions.hot.onDelete (v2) --------------------
exports.reactionsHotOnDeleteV2 = onDocumentDeleted(
  "reactions/{reactionId}",
  async (event) => {
    try {
      const data = event.data?.data() || {};
      const postId = data?.postId;
      const reactionType = data?.reactionType;

      // Guard: only hot + must have postId
      if (!postId || reactionType !== "hot") return null;

      const reactionId = event.params.reactionId;
      const eventId = event?.id;

      // If eventId is missing, we cannot guarantee idempotency safely
      if (!eventId) {
        console.warn("[warn] reactions.hot.onDelete: missing event.id", {
          reactionId,
          postId,
        });
        return null;
      }

      const postRef = db.collection("posts").doc(postId);

      // Idempotency marker MUST be bound to eventId (works with deterministic reactionId toggle)
      const markerId = `reactions.hot.onDelete__${eventId}`;
      const markerRef = db.collection("processedEvents").doc(markerId);

      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      // Thresholds (helper)
      const { hot: hotThreshold } = await getReactionThresholds();

      await db.runTransaction(async (tx) => {
        // Idempotency: same event retries are ignored
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        const postSnap = await tx.get(postRef);

        // Edge: post missing (deleted / invalid ref)
        if (!postSnap.exists) {
          console.warn("[warn] reactions.hot.onDelete: post missing", {
            eventId,
            reactionId,
            postId,
          });

          tx.set(markerRef, {
            type: "reactions.hot.onDelete",
            status: "skipped",
            reason: "post_missing",
            postId,
            reactionId,
            reactionType,
            eventId,
            processedAt: FieldValue.serverTimestamp(),
            expiresAt,
          });

          return;
        }

        const postData = postSnap.data() || {};
        const current = postData?.reactionCounts?.hot ?? 0;
        const next = Math.max(current - 1, 0);

        const update = {
          "reactionCounts.hot": next,
        };

        // COUNT rule: if it drops below threshold -> trending off immediately
        if (next < hotThreshold) {
          update["badges.trending"] = false;
        }

        tx.update(postRef, update);

        // Marker written after updates (same transaction)
        tx.set(markerRef, {
          type: "reactions.hot.onDelete",
          status: "applied",
          reason: null,
          postId,
          reactionId,
          reactionType,
          eventId,
          processedAt: FieldValue.serverTimestamp(),
          expiresAt,
        });
      });

      console.log("[ok] reactions.hot.onDelete", {
        eventId,
        reactionId,
        postId,
      });
      return null;
    } catch (err) {
      console.error("[err] reactionsHotOnDeleteV2", {
        eventId: event?.id ?? null,
        reactionId: event?.params?.reactionId ?? null,
        message: err?.message,
        stack: err?.stack,
      });

      throw err; // transient failure -> retry
    }
  }
);

// -------------------- SCHEDULER cleanupExpiredPosts (v2) --------------------
exports.cleanupExpiredPostsV2 = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "Europe/Belgrade",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async () => {
    const now = Timestamp.now();
    const cutoff = Timestamp.fromMillis(
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

// -------------------- SCHEDULER expireTrendingPosts (v2) --------------------
exports.expireTrendingPostsV2 = onSchedule(
  {
    schedule: "every 24 hours",
    timeZone: "Europe/Belgrade",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async () => {
    const DAYS = 7;
    const cutoffDate = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
    const cutoffTs = Timestamp.fromDate(cutoffDate);

    let totalUpdated = 0;
    let totalBatches = 0;

    async function processQuery(baseQuery, reason) {
      let query = baseQuery;

      while (true) {
        const snap = await query.get();
        if (snap.empty) break;

        const batch = db.batch();

        snap.docs.forEach((doc) => {
          batch.update(doc.ref, { "badges.trending": false });
        });

        await batch.commit();

        totalUpdated += snap.size;
        totalBatches += 1;

        const lastDoc = snap.docs[snap.docs.length - 1];
        query = baseQuery.startAfter(lastDoc);
      }

      console.log("[ok] expireTrendingPostsV2 batch run", {
        reason,
        updatedSoFar: totalUpdated,
        batchesSoFar: totalBatches,
      });
    }

    const expiredQuery = db
      .collection("posts")
      .where("badges.trending", "==", true)
      .where("lastHotAt", "<", cutoffTs)
      .orderBy("lastHotAt", "asc")
      .limit(400);

    const missingLastHotAtQuery = db
      .collection("posts")
      .where("badges.trending", "==", true)
      .where("lastHotAt", "==", null)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(400);

    await processQuery(expiredQuery, "expired");
    await processQuery(missingLastHotAtQuery, "missing_lastHotAt");

    console.log("[ok] expireTrendingPostsV2 done", {
      cutoff: cutoffDate.toISOString(),
      totalUpdated,
      totalBatches,
    });

    return null;
  }
);

// -------------------- FIRESTORE TRIGGER: reactions.powerup.onCreate (v2) --------------------
exports.reactionsPowerupOnCreateV2 = onDocumentCreated(
  "reactions/{reactionId}",
  async (event) => {
    const reactionId = event?.params?.reactionId;

    try {
      if (!reactionId) return null;

      const data = event.data?.data() || {};
      const postId = data?.postId;
      const reactorId = data?.userId;
      const reactionType = data?.reactionType;

      // Guard: only powerup
      if (reactionType !== "powerup") return null;

      const eventId = event?.id;
      if (!eventId) {
        console.warn("[warn] reactions.powerup.onCreate: missing event.id", {
          reactionId,
          postId,
        });
        return null;
      }

      // Marker MUST be bound to eventId (so toggle with deterministic reactionId works)
      const markerId = `reactions.powerup.onCreate__${eventId}`;
      const markerRef = db.collection("processedEvents").doc(markerId);

      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      // Missing fields: valid skip (no retry loop)
      if (!postId || !reactorId) {
        await markerRef.set(
          {
            type: "reactions.powerup.onCreate",
            status: "skipped",
            reason: "missing_fields",
            postId: postId ?? null,
            reactorId: reactorId ?? null,
            authorId: null,
            reactionId,
            reactionType,
            eventId,
            processedAt: FieldValue.serverTimestamp(),
            expiresAt,
          },
          { merge: true }
        );
        return null;
      }

      const postRef = db.collection("posts").doc(postId);
      const reactionRef = db.collection("reactions").doc(reactionId);

      // Thresholds (helper)
      const { powerup: powerupThreshold } = await getReactionThresholds();

      await db.runTransaction(async (tx) => {
        // ---------------- READS (must be first) ----------------
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        const postSnap = await tx.get(postRef);
        if (!postSnap.exists) {
          tx.set(
            markerRef,
            {
              type: "reactions.powerup.onCreate",
              status: "skipped",
              reason: "post_missing",
              postId,
              reactorId,
              authorId: null,
              reactionId,
              reactionType,
              eventId,
              processedAt: FieldValue.serverTimestamp(),
              expiresAt,
            },
            { merge: true }
          );
          return;
        }

        const postData = postSnap.data() || {};
        const authorId = postData?.userId;

        if (!authorId) {
          tx.set(
            markerRef,
            {
              type: "reactions.powerup.onCreate",
              status: "skipped",
              reason: "author_missing",
              postId,
              reactorId,
              authorId: null,
              reactionId,
              reactionType,
              eventId,
              processedAt: FieldValue.serverTimestamp(),
              expiresAt,
            },
            { merge: true }
          );
          return;
        }

        // define ref early so it can never be null
        const userStatsRef = db.collection("userStats").doc(authorId);
        const isSelf = reactorId === authorId;

        // Read userStats ONLY if not self-powerup
        let userStatsData = {};

        if (!isSelf) {
          const userStatsSnap = await tx.get(userStatsRef);
          userStatsData = userStatsSnap.exists
            ? userStatsSnap.data() || {}
            : {};
        }

        // ---------------- WRITES (after reads) ----------------

        // Stamp authorId into reaction doc (server-trusted)
        tx.set(reactionRef, { authorId }, { merge: true });

        // Self-powerup reject (MVP policy) - no aggregate changes
        if (isSelf) {
          tx.set(
            markerRef,
            {
              type: "reactions.powerup.onCreate",
              status: "rejected",
              reason: "self_powerup_rejected",
              postId,
              reactorId,
              authorId,
              reactionId,
              reactionType,
              eventId,
              processedAt: FieldValue.serverTimestamp(),
              expiresAt,
            },
            { merge: true }
          );
          return;
        }

        // Update post aggregate
        tx.update(postRef, {
          "reactionCounts.powerup": FieldValue.increment(1),
        });

        // Update author aggregate (init if missing via set+merge)
        const currentTotal = userStatsData?.powerupsTotal ?? 0;
        const nextTotal = currentTotal + 1;

        const alreadyTop = userStatsData?.badges?.topContributor === true;
        const shouldSetTop =
          !alreadyTop &&
          currentTotal < powerupThreshold &&
          nextTotal >= powerupThreshold;

        const patch = { powerupsTotal: nextTotal };

        if (shouldSetTop) {
          patch.badges = {
            ...(userStatsData?.badges || {}),
            topContributor: true,
          };
        }

        tx.set(userStatsRef, patch, { merge: true });

        // Marker applied
        tx.set(
          markerRef,
          {
            type: "reactions.powerup.onCreate",
            status: "applied",
            reason: null,
            postId,
            reactorId,
            authorId,
            reactionId,
            reactionType,
            eventId,
            processedAt: FieldValue.serverTimestamp(),
            expiresAt,
          },
          { merge: true }
        );
      });

      console.log("[ok] reactions.powerup.onCreate", {
        eventId,
        reactionId,
        postId,
      });
      return null;
    } catch (err) {
      console.error("[err] reactionsPowerupOnCreateV2", {
        eventId: event?.id ?? null,
        reactionId,
        message: err?.message,
        stack: err?.stack,
      });
      throw err;
    }
  }
);

// -------------------- FIRESTORE TRIGGER: reactions.powerup.onDelete (v2) --------------------
exports.reactionsPowerupOnDeleteV2 = onDocumentDeleted(
  "reactions/{reactionId}",
  async (event) => {
    const reactionId = event?.params?.reactionId;

    try {
      if (!reactionId) return null;

      const data = event.data?.data() || {};
      const postId = data?.postId;
      const reactorId = data?.userId;
      const reactionType = data?.reactionType;

      // Prefer stamped authorId (server-trusted) for resilience
      const stampedAuthorId = data?.authorId ?? null;

      // Guard: only powerup
      if (reactionType !== "powerup") return null;

      const eventId = event?.id;
      if (!eventId) {
        console.warn("[warn] reactions.powerup.onDelete: missing event.id", {
          reactionId,
          postId,
        });
        return null;
      }

      // Marker MUST be bound to eventId (so toggle with deterministic reactionId works)
      const markerId = `reactions.powerup.onDelete__${eventId}`;
      const markerRef = db.collection("processedEvents").doc(markerId);

      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      // Missing fields: valid skip (no retry loop)
      if (!postId || !reactorId) {
        await markerRef.set(
          {
            type: "reactions.powerup.onDelete",
            status: "skipped",
            reason: "missing_fields",
            postId: postId ?? null,
            reactorId: reactorId ?? null,
            authorId: stampedAuthorId,
            reactionId,
            reactionType,
            eventId,
            processedAt: FieldValue.serverTimestamp(),
            expiresAt,
          },
          { merge: true }
        );
        return null;
      }

      const postRef = db.collection("posts").doc(postId);

      await db.runTransaction(async (tx) => {
        // ---------------- READS (must be first) ----------------
        const markerSnap = await tx.get(markerRef);
        if (markerSnap.exists) return;

        // Determine authorId:
        // 1) use stamped authorId from reaction doc if present
        // 2) fallback to reading post.userId
        let authorId = stampedAuthorId;

        let postSnap = null;
        let postData = null;

        // We still TRY to read post (to decrement post aggregate), but it may not exist.
        postSnap = await tx.get(postRef);
        if (postSnap.exists) {
          postData = postSnap.data() || {};
          if (!authorId) authorId = postData?.userId ?? null;
        }

        if (!authorId) {
          tx.set(
            markerRef,
            {
              type: "reactions.powerup.onDelete",
              status: "skipped",
              reason:
                postSnap && !postSnap.exists
                  ? "post_missing"
                  : "author_missing",
              postId,
              reactorId,
              authorId: null,
              reactionId,
              reactionType,
              eventId,
              processedAt: FieldValue.serverTimestamp(),
              expiresAt,
            },
            { merge: true }
          );
          return;
        }

        // Self-powerup guard (must match onCreate policy)
        if (reactorId === authorId) {
          tx.set(
            markerRef,
            {
              type: "reactions.powerup.onDelete",
              status: "rejected",
              reason: "self_powerup_rejected",
              postId,
              reactorId,
              authorId,
              reactionId,
              reactionType,
              eventId,
              processedAt: FieldValue.serverTimestamp(),
              expiresAt,
            },
            { merge: true }
          );
          return;
        }

        const userStatsRef = db.collection("userStats").doc(authorId);
        const userStatsSnap = await tx.get(userStatsRef);
        const userStatsData = userStatsSnap.exists
          ? userStatsSnap.data() || {}
          : {};

        // ---------------- WRITES (after reads) ----------------

        // Decrement post aggregate ONLY if post exists
        if (postSnap && postSnap.exists) {
          const currentPostPowerups = postData?.reactionCounts?.powerup ?? 0;
          const nextPostPowerups = Math.max(currentPostPowerups - 1, 0);

          tx.update(postRef, {
            "reactionCounts.powerup": nextPostPowerups,
          });
        }

        // Decrement author aggregate (clamp 0) - userStats doc may be missing
        const currentTotal = userStatsData?.powerupsTotal ?? 0;
        const nextTotal = Math.max(currentTotal - 1, 0);

        // Latch: do not touch badges.topContributor
        tx.set(userStatsRef, { powerupsTotal: nextTotal }, { merge: true });

        // Marker applied
        tx.set(
          markerRef,
          {
            type: "reactions.powerup.onDelete",
            status: "applied",
            reason: null,
            postId,
            reactorId,
            authorId,
            reactionId,
            reactionType,
            postMissing: !(postSnap && postSnap.exists),
            eventId,
            processedAt: FieldValue.serverTimestamp(),
            expiresAt,
          },
          { merge: true }
        );
      });

      console.log("[ok] reactions.powerup.onDelete", {
        eventId,
        reactionId,
        postId,
      });
      return null;
    } catch (err) {
      console.error("[err] reactionsPowerupOnDeleteV2", {
        eventId: event?.id ?? null,
        reactionId,
        message: err?.message,
        stack: err?.stack,
      });
      throw err;
    }
  }
);
