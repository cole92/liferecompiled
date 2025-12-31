import PropTypes from "prop-types";
import { useContext, useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { doc, getDoc, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";

import { AuthContext } from "../../../../context/AuthContext";
import { db } from "../../../../firebase";
import { buildSavedQuery } from "../../../../services/savedPostsService";
import { enrichPostWithAuthor } from "../../../../services/userService";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "../../../../utils/toastUtils";

import { savePost, unsavePost } from "../../../../services/savedService";
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
 * - Optimistic "unsave": odmah uklanja iz liste + odmah brise u Firestore
 * - Undo: radi savePost rollback u okviru toast prozora
 *
 * @returns {JSX.Element}
 */
const SavedPosts = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const { savedSortDirection } = useOutletContext();

  const [savedPosts, setSavedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const POST_PER_PAGE = 10;
  const UNDO_MS = 7000;

  // Map<postId, { snapshot, index, didUndo }>
  // koristi se kao "lock" da sprecis dupli klik i da znas da li da prikazes success na isteku
  const pendingUndoRef = useRef(new Map());

  // Guard: da ne radimo setState nakon unmount-a
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const insertAt = (arr, index, item) => {
    const copy = arr.slice();
    copy.splice(Math.min(index, copy.length), 0, item);
    return copy;
  };

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

  useEffect(() => {
    let canceled = false;

    if (isCheckingAuth) return;
    if (!user) return;

    setSavedPosts([]);
    setLastDoc(null);
    setHasMore(true);
    setIsLoadingMore(false);

    const fetchSavedPosts = async () => {
      setIsLoading(true);
      try {
        const q = buildSavedQuery({
          uid: user.uid,
          pageSize: POST_PER_PAGE,
          sortDirection: savedSortDirection,
        });

        const savedSnap = await getDocs(q);
        if (canceled) return;

        if (savedSnap.empty) {
          setSavedPosts([]);
          setHasMore(false);
          setIsLoading(false);
          return;
        }

        setLastDoc(savedSnap.docs[savedSnap.docs.length - 1]);
        setHasMore(savedSnap.size === POST_PER_PAGE);

        const results = await Promise.allSettled(
          savedSnap.docs.map(async (docItem) => {
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
                "[SavedPosts] Failed to fetch post, using ghost fallback:",
                docItem.id,
                error
              );
              return buildGhostFromSaved(savedMeta, docItem.id);
            }
          })
        );

        const posts = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);

        if (!canceled) setSavedPosts(posts);
      } catch (error) {
        console.error("Error fetching saved posts (top-level):", error);
        if (!canceled) showErrorToast("Something went wrong.");
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    fetchSavedPosts();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isCheckingAuth, savedSortDirection]);

  const handleLoadMore = async () => {
    if (!user || !hasMore || isLoadingMore || !lastDoc) return;
    setIsLoadingMore(true);

    try {
      const q = buildSavedQuery({
        uid: user.uid,
        afterDoc: lastDoc,
        pageSize: POST_PER_PAGE,
        sortDirection: savedSortDirection,
      });

      const snap = await getDocs(q);

      if (snap.empty) {
        setHasMore(false);
        return;
      }

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

  if (isCheckingAuth || isLoading) {
    return (
      <div className="grid gap-4" role="status" aria-live="polite">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const UndoToast = ({ onUndo }) => (
    <div className="flex items-center gap-3">
      <span>Removed from saved.</span>
      <button type="button" onClick={onUndo} className="underline">
        Undo
      </button>
    </div>
  );
  UndoToast.propTypes = { onUndo: PropTypes.func.isRequired };

  if (!user) return <p>Please log in to view saved posts.</p>;
  if (savedPosts.length === 0)
    return <EmptyState message="You haven't saved any posts yet." />;

  const handleUnsave = async (post) => {
    if (!user) return;
    if (pendingUndoRef.current.has(post.id)) return;

    const index = savedPosts.findIndex((p) => p.id === post.id);
    if (index === -1) return;

    // optimistic UI
    setSavedPosts((prev) => prev.filter((p) => p.id !== post.id));

    const snapshotForSave = {
      postTitleAtSave: post?.title || "Untitled",
      postUpdatedAtAtSave: post?.updatedAt || post?.createdAt || null,
    };

    // lock odmah (da sprecimo dupli klik)
    pendingUndoRef.current.set(post.id, {
      snapshot: post,
      index,
      didUndo: false,
    });

    // unsave odmah u bazu
    try {
      await unsavePost(user.uid, post.id);
    } catch (error) {
      pendingUndoRef.current.delete(post.id);
      if (mountedRef.current) {
        setSavedPosts((prev) => insertAt(prev, index, post));
      }
      showErrorToast("Unsave failed, restored.");
      console.error(error);
      return;
    }

    // napravimo toast i sacuvamo id u closure-u (ne u ref)
    const toastId = toast(<UndoToast onUndo={onUndo} />, {
      autoClose: UNDO_MS,
      position: "top-center",
      pauseOnHover: false,
      pauseOnFocusLoss: false,
      onClose: () => {
        // ako je undo vec uradjen, entry je obrisan i nema sta da radimo
        const entry = pendingUndoRef.current.get(post.id);
        if (!entry) return;

        if (!entry.didUndo) {
          showSuccessToast("Removed from saved!");
        }

        pendingUndoRef.current.delete(post.id);
      },
    });

    async function onUndo() {
      const entry = pendingUndoRef.current.get(post.id);
      if (!entry) return;

      // markiraj undo pre svega
      pendingUndoRef.current.set(post.id, { ...entry, didUndo: true });

      // vrati u UI odmah
      if (mountedRef.current) {
        setSavedPosts((prev) => insertAt(prev, entry.index, entry.snapshot));
      }

      // dismiss toast ODMAH (ovo si trazio)
      toast.dismiss(toastId);

      // OTkljucaj ODMAH, da mozes opet save/unsave bez refresha
      pendingUndoRef.current.delete(post.id);

      try {
        await savePost(user.uid, post.id, snapshotForSave);
        showInfoToast("Restored.");
      } catch (e) {
        // rollback UI ako restore padne
        if (mountedRef.current) {
          setSavedPosts((prev) => prev.filter((p) => p.id !== post.id));
        }
        showErrorToast("Restore failed.");
        console.error(e);
      }
    }
  };

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

      {isLoadingMore && (
        <div className="mt-2 space-y-2" role="status" aria-live="polite">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={isLoadingMore || !hasMore}
          aria-busy={isLoadingMore}
          aria-disabled={isLoadingMore || !hasMore}
        >
          {isLoadingMore ? "Loading..." : "Load more"}
        </button>
      )}

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
