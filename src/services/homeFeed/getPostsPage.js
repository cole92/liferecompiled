// services/homeFeed/getPostsPage.js
// Servisni sloj: koristi buildHomeFeedQuery, izvrsava upit i vraca stranicu podataka.

import { getDocs } from "firebase/firestore";
import { db } from "../../firebase";

import { PAGE_SIZE_DEFAULT, clampPageSize } from "../../constants/feed";

import { buildHomeFeedQuery } from "../../queries/buildHomeFeedQuery";
import { normalizePostDoc } from "../../mappers/posts/normalizePostDoc";
import { enrichPostWithAuthor } from "../userService";

/**
 * Fetches one feed page with normalized posts and enriched authors.
 * Assumes enrichPostWithAuthor never throws (Promise.all is safe).
 */

export async function getPostsPage({
  afterDoc = null,
  pageSize,
  category,
  sortBy,
}) {
  const safePageSize = clampPageSize(pageSize ?? PAGE_SIZE_DEFAULT);

  const q = buildHomeFeedQuery({
    db,
    afterDoc,
    pageSize: safePageSize,
    category,
    sortBy,
  });

  const snap = await getDocs(q);

  const warnings = [];

  // 5) Normalize docs (and collect warnings for skipped ones)
  const normalized = [];
  for (const docSnap of snap.docs) {
    const post = normalizePostDoc(docSnap);

    if (!post) {
      warnings.push(`NORMALIZE_SKIP: invalid post (postId=${docSnap.id})`);
      continue;
    }

    normalized.push(post);
  }

  // 6) Enrich authors per page
  const items = await Promise.all(
    normalized.map((post) => enrichPostWithAuthor(post))
  );

  // 7) Detect fallback authors (optional diagnostics)
  for (const item of items) {
    const isMissingUserId = !item.userId;
    const isFallbackAuthor = item.author?.deleted === true;

    if (isMissingUserId || isFallbackAuthor) {
      const userIdLabel = item.userId ?? "null-or-undefined";
      warnings.push(
        `AUTHOR_FALLBACK: userId=${userIdLabel} (postId=${item.id})`
      );
    }
  }

  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  const hasMore = snap.size === safePageSize;

  return { items, lastDoc, hasMore, warnings };
}
