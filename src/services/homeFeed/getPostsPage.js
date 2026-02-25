// services/homeFeed/getPostsPage.js
// Service layer: uses buildHomeFeedQuery, executes the query, and returns a page of data.

import { getDocs } from "firebase/firestore";
import { db } from "../../firebase";

import { PAGE_SIZE_DEFAULT, clampPageSize } from "../../constants/feed";

import { buildHomeFeedQuery } from "../../queries/buildHomeFeedQuery";
import { normalizePostDoc } from "../../mappers/posts/normalizePostDoc";
import { enrichPostWithAuthor } from "../userService";

/**
 * @helper getPostsPage
 *
 * Fetches one Home feed page, normalizes posts, and enriches them with author data.
 *
 * Result:
 * - items: array of posts with an `author` field (uses a fallback when the user is missing)
 * - lastDoc: the last DocumentSnapshot in the page (or null)
 * - hasMore: whether there are more documents available (prefetch +1)
 * - warnings: string messages for skipped docs / fallback cases (for logging/debugging)
 */
export async function getPostsPage({
  afterDoc = null,
  pageSize,
  category,
  sortBy,
}) {
  // Defensive clamp of pageSize to global feed bounds (feed constants)
  const safePageSize = clampPageSize(pageSize ?? PAGE_SIZE_DEFAULT);

  // Prefetch +1 so we can know if there is really more (without an extra query)
  const requestedSize = safePageSize + 1;

  const q = buildHomeFeedQuery({
    db,
    afterDoc,
    pageSize: requestedSize,
    category,
    sortBy,
  });

  const snap = await getDocs(q);

  const warnings = [];

  // Use only "page" documents for rendering
  const pageDocs = snap.docs.slice(0, safePageSize);

  // Normalize documents (and collect warnings for skipped ones)
  const normalized = [];
  for (const docSnap of pageDocs) {
    const post = normalizePostDoc(docSnap);

    if (!post) {
      warnings.push(`NORMALIZE_SKIP: invalid post (postId=${docSnap.id})`);
      continue;
    }

    normalized.push(post);
  }

  // Enrich authors per page (UI should always receive post.author)
  const items = await Promise.all(
    normalized.map((post) => enrichPostWithAuthor(post)),
  );

  // Diagnostics: fallback authors / missing userId (not for UI, but for logs)
  for (const item of items) {
    const isMissingUserId = !item.userId;
    const isFallbackAuthor = item.author?.deleted === true;

    if (isMissingUserId || isFallbackAuthor) {
      const userIdLabel = item.userId ?? "null-or-undefined";
      warnings.push(
        `AUTHOR_FALLBACK: userId=${userIdLabel} (postId=${item.id})`,
      );
    }
  }

  // lastDoc must be the last RENDERED doc (not the +1 prefetch doc)
  const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

  // hasMore = true only if we received more than safePageSize
  const hasMore = snap.docs.length > safePageSize;

  return { items, lastDoc, hasMore, warnings };
}
