import { useEffect, useMemo, useState } from "react";
import { collection, documentId, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Fetch savedPosts docs for current page of postIds.
 * Firestore "in" max is 10 -> chunk into 10-sized queries.
 */
export function useSavedIdsForPostIds(userId, postIds) {
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  const safeIds = useMemo(() => {
    if (!Array.isArray(postIds)) return [];
    return postIds.filter(Boolean);
  }, [postIds]);

  useEffect(() => {
    let canceled = false;

    if (!userId || safeIds.length === 0) {
      setSavedIds(new Set());
      return;
    }

    const run = async () => {
      setIsLoadingSaved(true);

      try {
        const colRef = collection(db, "users", userId, "savedPosts");
        const chunks = chunkArray(safeIds, 10);

        const results = await Promise.all(
          chunks.map((ids) =>
            getDocs(query(colRef, where(documentId(), "in", ids)))
          )
        );

        if (canceled) return;

        const next = new Set();
        for (const snap of results) {
          snap.forEach((d) => next.add(d.id));
        }

        setSavedIds(next);
      } catch (e) {
        if (!canceled) setSavedIds(new Set());
        console.error("[useSavedIdsForPostIds] Failed:", e);
      } finally {
        if (!canceled) setIsLoadingSaved(false);
      }
    };

    run();

    return () => {
      canceled = true;
    };
  }, [userId, safeIds]);

  return { savedIds, setSavedIds, isLoadingSaved };
}
