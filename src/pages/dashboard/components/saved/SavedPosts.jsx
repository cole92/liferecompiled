import PropTypes from "prop-types";
import { useContext, useEffect, useState, useRef } from "react";
import { doc, getDoc, getDocs } from "firebase/firestore";

import { AuthContext } from "../../../../context/AuthContext";
import { db } from "../../../../firebase";
import { buildSavedQuery } from "../../../../services/savedPostsService";

import { enrichPostWithAuthor } from "../../../../services/userService";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../../../../utils/toastUtils";
import { toast } from "react-toastify";

import { unsavePost } from "../../../../services/savedService";
import SavedPostCard from "./SavedPostCard";
import EmptyState from "../EmptyState";
import SkeletonCard from "../../../../components/ui/skeletonLoader/SkeletonCard";

/**
 * @component SavedPosts
 *
 * Lista sacuvanih postova korisnika sa paginacijom i Undo za "unsave".
 *
 * - Paginacija: users/{uid}/savedPosts (order by savedAt desc, startAfter, limit)
 * - Resilient fetch: Promise.allSettled preskace nevalidne reference (privatno/obrisano)
 * - Enrichment: dohvat posta + autor meta (enrichPostWithAuthor)
 * - Optimistic "unsave": odmah uklanja iz liste, prikazuje Undo toast, i posle tajmera salje upit
 * - Undo: vraca post na originalni index ako korisnik ponisti akciju
 *
 * @returns {JSX.Element}
 */
const SavedPosts = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const [savedPosts, setSavedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Paginacija
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const POST_PER_PAGE = 10;
  const UNDO_MS = 7000;

  // Cuvamo pending unsave operacije dok ne istekne undo prozor
  // Map<postId, { timerId, snapshot, index }>
  const pendingUndoRef = useRef(new Map());

  // Pomocna: ubaci item na tacan index (korisno za Undo restore)
  const insertAt = (arr, index, item) => {
    const copy = arr.slice();
    copy.splice(Math.min(index, copy.length), 0, item);
    return copy;
  };

  // Helper: pravi "ghost" post kada original vise ne postoji / nemamo pristup
  const buildGhostFromSaved = (savedMeta, id) => ({
    id,
    title: savedMeta.postTitleAtSave || "Post is no longer available",
    content: null,
    description: null,
    category: null,
    createdAt: null,
    updatedAt: null,
    locked: false,
    lockedAt: null,
    deleted: true,
    isRemoved: true,
    tags: [],
    author: null,
    badges: {},
    savedAt: savedMeta.savedAt,
    postUpdatedAtAtSave: savedMeta.postUpdatedAtAtSave,
    postTitleAtSave: savedMeta.postTitleAtSave,
  });

  // Cleanup svih pending tajmera na unmount
  useEffect(() => {
    const ref = pendingUndoRef.current;
    return () => {
      for (const { timerId } of ref.values()) {
        clearTimeout(timerId);
      }
      ref.clear();
    };
  }, []);

  useEffect(() => {
    let canceled = false;

    // Ne pokrecemo fetch dok auth nije gotov; gosti ne citaju
    if (isCheckingAuth) return;
    if (!user) return;

    // Reset state-a pri promeni user-a ili ulasku na stranicu
    setSavedPosts([]);
    setLastDoc(null);
    setHasMore(true);
    setIsLoadingMore(false);

    const fetchSavedPosts = async () => {
      setIsLoading(true);
      try {
        const q = buildSavedQuery({ uid: user.uid, pageSize: POST_PER_PAGE });
        const savedSnap = await getDocs(q);
        if (canceled) return;

        if (savedSnap.empty) {
          setSavedPosts([]);
          setHasMore(false);
          setIsLoading(false);
          return;
        }

        // Kursor + indikator da li ima jos
        setLastDoc(savedSnap.docs[savedSnap.docs.length - 1]);
        setHasMore(savedSnap.size === POST_PER_PAGE);

        const results = await Promise.allSettled(
          savedSnap.docs.map(async (docItem) => {
            const savedMeta = docItem.data();
            const postRef = doc(db, "posts", docItem.id);

            try {
              const postSnap = await getDoc(postRef);

              // Ako doc ne postoji → ghost
              if (!postSnap.exists()) {
                return buildGhostFromSaved(savedMeta, docItem.id);
              }

              const postData = { id: postSnap.id, ...postSnap.data() };
              const enrichedPost = await enrichPostWithAuthor(postData);

              return {
                ...enrichedPost,
                savedAt: savedMeta.savedAt,
                postUpdatedAtAtSave: savedMeta.postUpdatedAtAtSave,
                postTitleAtSave: savedMeta.postTitleAtSave,
                isRemoved: false,
              };
            } catch (error) {
              console.warn(
                "[SavedPosts] Failed to fetch post, using ghost fallback:",
                docItem.id,
                error
              );

              // Bilo kakav error (permission-denied, itd.) → tretiramo kao “vise nije dostupan”
              return buildGhostFromSaved(savedMeta, docItem.id);
            }
          })
        );

        // Zadrzi samo fulfilled rezultate
        const posts = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);

        if (canceled) return;
        setSavedPosts(posts);
      } catch (error) {
        // Top-level greska (npr. mreza); per-item greske idu kroz allSettled
        console.error("Error fetching saved posts (top-level):", error);
        if (!canceled) showErrorToast("Something went wrong.");
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    fetchSavedPosts();

    return () => {
      canceled = true; // sprecava setState posle unmount-a
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isCheckingAuth]);

  // Dovlaci sledecu stranicu i enrich-uje validne postove
  const handleLoadMore = async () => {
    if (!user || !hasMore || isLoadingMore || !lastDoc) return;
    setIsLoadingMore(true);

    try {
      const q = buildSavedQuery({
        uid: user.uid,
        afterDoc: lastDoc,
        pageSize: POST_PER_PAGE,
      });

      const snap = await getDocs(q);

      if (snap.empty) {
        setHasMore(false);
        return;
      }

      // Kursor + hasMore
      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.size === POST_PER_PAGE);

      const results = await Promise.allSettled(
        snap.docs.map(async (docItem) => {
          const savedMeta = docItem.data();
          const postRef = doc(db, "posts", docItem.id);

          try {
            const postSnap = await getDoc(postRef);

            if (!postSnap.exists()) {
              return buildGhostFromSaved(savedMeta, docItem.id);
            }

            const postData = { id: postSnap.id, ...postSnap.data() };
            const enrichedPost = await enrichPostWithAuthor(postData);

            return {
              ...enrichedPost,
              savedAt: savedMeta.savedAt,
              postUpdatedAtAtSave: savedMeta.postUpdatedAtAtSave,
              postTitleAtSave: savedMeta.postTitleAtSave,
              isRemoved: false,
            };
          } catch (error) {
            console.warn(
              "[SavedPosts] Failed to fetch post in LoadMore, using ghost fallback:",
              docItem.id,
              error
            );
            return buildGhostFromSaved(savedMeta, docItem.id);
          }
        })
      );

      const newPosts = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);

      // Merge bez duplikata (novi pregaze stare po id-u)
      setSavedPosts((prev) => {
        const merged = [...prev, ...newPosts];
        const byId = new Map(merged.map((p) => [p.id, p]));
        return Array.from(byId.values());
      });
    } catch (e) {
      showErrorToast("Failed to load more saved posts.");
      console.error("Error loading more posts:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Auth-check moze ostati early-return da ne treperi UI tokom inicijalne provere
  if (isCheckingAuth || isLoading) {
    return (
      <div className="grid gap-4" role="status" aria-live="polite">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Inline komponenta za Undo toast (minimalno, fokus na UX)
  const UndoToast = ({ onUndo }) => (
    <div className="flex items-center gap-3">
      <span>Removed from saved.</span>
      <button onClick={onUndo} className="underline">
        Undo
      </button>
    </div>
  );
  UndoToast.propTypes = {
    onUndo: PropTypes.func.isRequired,
  };

  // Guest gate
  if (!user) {
    return <p>Please log in to view saved posts.</p>;
  }

  // Empty state
  if (savedPosts.length === 0) {
    return <EmptyState message="You haven't saved any posts yet." />;
  }

  // Optimistic unsave sa Undo prozorom (UNDO_MS)
  const handleUnsave = (post) => {
    if (!user) return;
    // Ako vec ima pending unsave za ovaj post → ignorisi dupli klik
    if (pendingUndoRef.current.has(post.id)) return;

    const index = savedPosts.findIndex((p) => p.id === post.id);
    if (index === -1) return;

    // Optimistic: odmah ukloni iz liste
    setSavedPosts((prev) => prev.filter((p) => p.id !== post.id));

    // Zakazi stvarni unsave posle UNDO_MS (ako korisnik ne ponisti)
    const timerId = setTimeout(async () => {
      pendingUndoRef.current.delete(post.id);
      try {
        await unsavePost(user.uid, post.id);
        showSuccessToast("Removed from saved!");
      } catch (error) {
        // Ako pozadinska operacija padne → vrati post na originalni index
        setSavedPosts((prev) => insertAt(prev, index, post));
        showErrorToast("Unsave failed, restored.");
        console.error(error);
      }
    }, UNDO_MS);

    // Upisi u pending mapu info potreban za Undo
    pendingUndoRef.current.set(post.id, { timerId, snapshot: post, index });

    // Undo callback: prekini tajmer i vrati post na mesto
    const onUndo = () => {
      const entry = pendingUndoRef.current.get(post.id);
      if (!entry) return;
      clearTimeout(entry.timerId);
      pendingUndoRef.current.delete(post.id);
      setSavedPosts((prev) => insertAt(prev, entry.index, entry.snapshot));
      showInfoToast("Restored.");
    };

    // Toast sa Undo dugmetom
    toast(<UndoToast onUndo={onUndo} />, {
      autoClose: UNDO_MS,
      position: "top-center",
      pauseOnHover: false,
      pauseOnFocusLoss: false,
    });
  };

  // Lista sacuvanih postova + paginacija
  return (
    <div>
      <h1>Saved Posts</h1>

      {savedPosts.map((post) => {
        const isPending = pendingUndoRef.current.has(post.id);
        return (
          <div key={post.id}>
            <SavedPostCard
              post={post}
              onUnsave={handleUnsave}
              isPendingUndo={isPending}
            />
          </div>
        );
      })}

      {/* Loading more (mini skeletoni tokom fetch-a) */}
      {isLoadingMore && (
        <div className="mt-2 space-y-2" role="status" aria-live="polite">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Dugme "Load more" */}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isLoadingMore || !hasMore}
          aria-busy={isLoadingMore}
          aria-disabled={isLoadingMore || !hasMore}
        >
          {isLoadingMore ? "Loading..." : "Load more"}
        </button>
      )}

      {/* Poruka "You reached the end" */}
      {!hasMore && savedPosts.length > 0 && (
        <p
          className="mt-4 text-sm text-gray-500 text-center"
          aria-live="polite"
        >
          You reached the end.
        </p>
      )}
    </div>
  );
};

export default SavedPosts;
