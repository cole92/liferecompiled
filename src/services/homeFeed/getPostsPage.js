// services/homeFeed/getPostsPage.js
// Servisni sloj: koristi buildHomeFeedQuery, izvrsava upit i vraca stranicu podataka.

import { getDocs } from "firebase/firestore";
import { db } from "../../firebase";

import { PAGE_SIZE_DEFAULT, clampPageSize } from "../../constants/feed";

import { buildHomeFeedQuery } from "../../queries/buildHomeFeedQuery";
import { normalizePostDoc } from "../../mappers/posts/normalizePostDoc";
import { enrichPostWithAuthor } from "../userService";

/**
 * @helper getPostsPage
 * Fetch-uje jednu stranicu Home feed-a, normalizuje postove i obogacuje ih autorima.
 *
 * Rezultat:
 * - items: niz postova sa `author` poljem (fallback kada nema user-a)
 * - lastDoc: poslednji DocumentSnapshot u stranici (ili null)
 * - hasMore: da li postoji jos dokumenata (prefetch +1)
 * - warnings: string poruke o preskocenim/ fallback slucajevima
 */
export async function getPostsPage({
  afterDoc = null,
  pageSize,
  category,
  sortBy,
}) {
  // Defanzivno klampovanje pageSize na globalne granice (feed constants)
  const safePageSize = clampPageSize(pageSize ?? PAGE_SIZE_DEFAULT);

  // Prefetch +1 da bismo znali da li stvarno ima jos (bez dodatnog upita)
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

  // Uzimamo samo "page" dokumente za prikaz
  const pageDocs = snap.docs.slice(0, safePageSize);

  // Normalizacija dokumenata (i prikupljanje upozorenja za preskocene)
  const normalized = [];
  for (const docSnap of pageDocs) {
    const post = normalizePostDoc(docSnap);

    if (!post) {
      warnings.push(`NORMALIZE_SKIP: invalid post (postId=${docSnap.id})`);
      continue;
    }

    normalized.push(post);
  }

  // Obogacivanje autora po stranici (UI dobija post.author uvek)
  const items = await Promise.all(
    normalized.map((post) => enrichPostWithAuthor(post))
  );

  // Dijagnostika: fallback autori / nedostajuci userId (nije za UI, vec za logovanje)
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

  // lastDoc mora da bude poslednji PRIKAZAN doc (ne +1)
  const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

  // hasMore = true samo ako smo dobili vise od safePageSize
  const hasMore = snap.docs.length > safePageSize;

  return { items, lastDoc, hasMore, warnings };
}
