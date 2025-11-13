// services/homeFeed/getPostsPage.js
// Servisni sloj: koristi buildHomeFeedQuery, izvrsava upit i vraca stranicu podataka.

import { getDocs } from "firebase/firestore";
import { db } from "../../firebase";

import { PAGE_SIZE_DEFAULT, clampPageSize } from "../../constants/feed";

import { buildHomeFeedQuery } from "../../queries/buildHomeFeedQuery";

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

  const items = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const lastDoc = snap.docs.lenght > 0 ? snap.docs[snap.docs.length - 1] : null;
  const hasMore = snap.size === safePageSize;

  return { items, lastDoc, hasMore };
}
