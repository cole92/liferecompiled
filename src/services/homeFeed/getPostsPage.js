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
 * Namena:
 * - Spaja tri sloja: Query builder (buildHomeFeedQuery) + normalizaciju (normalizePostDoc)
 *   + obogacivanje autora (enrichPostWithAuthor).
 * - Vraca rezultat spreman za UI: lista postova + kursor + hasMore + dijagnosticki log (warnings).
 *
 * Ulazni parametri:
 * - afterDoc: opcioni kursor za paginaciju (startAfter)
 * - pageSize: trazena velicina stranice (klampuje se na dozvoljeni opseg)
 * - category: opcioni filter kategorije
 * - sortBy: smer sortiranja (newest/oldest), sanitizuje se u builderu
 *
 * Ocekivanja i fallback:
 * - normalizePostDoc moze vratiti null za nevalidne dokumente → oni se preskacu uz warning.
 * - enrichPostWithAuthor ne treba da baca (dizajnirano da vrati fallback autora).
 * - warnings niz se koristi za debug i logovanje (nije namenjen direktno UI-u).
 *
 * Rezultat:
 * - items: niz postova sa `author` poljem (fallback kada nema user-a)
 * - lastDoc: poslednji DocumentSnapshot u stranici (ili null)
 * - hasMore: da li postoji potencijalno jos dokumenata (na osnovu velicine stranice)
 * - warnings: string poruke o preskocenim/ fallback slucajevima
 *
 * @param {Object} opts
 * @param {DocumentSnapshot|null} [opts.afterDoc=null]
 * @param {number} [opts.pageSize]
 * @param {string} [opts.category]
 * @param {string} [opts.sortBy]
 * @returns {Promise<{items: Object[], lastDoc: DocumentSnapshot|null, hasMore: boolean, warnings: string[]}>}
 */
export async function getPostsPage({
  afterDoc = null,
  pageSize,
  category,
  sortBy,
}) {
  // Defanzivno klampovanje pageSize na globalne granice (feed constants)
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

  // Normalizacija dokumenata (i prikupljanje upozorenja za preskocene)
  const normalized = [];
  for (const docSnap of snap.docs) {
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

  // Kursor i informacija o jos stranica (na osnovu velicine stranice)
  const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  const hasMore = snap.size === safePageSize;

  return { items, lastDoc, hasMore, warnings };
}
