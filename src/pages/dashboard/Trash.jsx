// Paketi
import { useContext, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  collection,
  doc,
  orderBy,
  query,
  where,
  updateDoc,
  getDocs,
  limit,
  startAfter,
} from "firebase/firestore";

// Konfiguracija i kontekst
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";

// Util funkcije i konstante
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";
import { showErrorToast, showSuccessToast } from "../../utils/toastUtils";
import ConfirmModal from "../../components/modals/ConfirmModal";
import { getDaysLeft } from "../../utils/dateUtils";
import { motion, AnimatePresence } from "framer-motion";

// Komponente
import PostCardTrash from "../../components/PostCardTrash";
import EmptyState from "./components/EmptyState";
import SkeletonCard from "../../components/ui/skeletonLoader/SkeletonCard";

const Trash = () => {
  const { user } = useContext(AuthContext);
  const { filterRange } = useOutletContext();

  const [deletedPosts, setDeletedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postIdToDelete, setPostIdToDelete] = useState(null);

  // Paginacija
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const POST_PER_PAGE = 10;

  const author = user
    ? {
        id: user.uid,
        name: user.name || "Anonymous",
        profilePicture: user.profilePicture || DEFAULT_PROFILE_PICTURE,
        badges: user.badges || {},
      }
    : null;

  const gridBase = "grid gap-4 grid-cols-1 lg:grid-cols-2";

  // IMPORTANT:
  // Dashboard layout najverovatnije vec ima ui-shell oko Outlet-a,
  // zato ovde NE stavljamo ui-shell (da ne dobijemo dupli/narrow wrapper).
  const shell = "w-full pb-2";

  const wrap = "space-y-6 py-6";

  useEffect(() => {
    let canceled = false;

    if (!user) return;

    const fetchFirstPage = async () => {
      setIsLoading(true);
      setDeletedPosts([]);
      setLastDoc(null);
      setHasMore(true);
      setIsLoadingMore(false);

      try {
        const postRef = collection(db, "posts");

        // Prefetch +1 (eliminise fake Load more kad ima tacno 10)
        const q = query(
          postRef,
          where("userId", "==", user.uid),
          where("deleted", "==", true),
          orderBy("deletedAt", "desc"),
          limit(POST_PER_PAGE + 1),
        );

        const snap = await getDocs(q);
        if (canceled) return;

        if (snap.empty) {
          setDeletedPosts([]);
          setHasMore(false);
          return;
        }

        const docs = snap.docs;
        const pageDocs = docs.slice(0, POST_PER_PAGE);

        if (pageDocs.length === 0) {
          setDeletedPosts([]);
          setHasMore(false);
          return;
        }

        setLastDoc(pageDocs[pageDocs.length - 1]);
        setHasMore(docs.length > POST_PER_PAGE);

        const posts = pageDocs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            author,
            comments: data.comments || [],
          };
        });

        setDeletedPosts(posts);
      } catch (error) {
        console.error("Error fetching posts:", error);
        if (!canceled) {
          showErrorToast("Failed to load your posts. Please try again.");
        }
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    fetchFirstPage();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleLoadMore = async () => {
    if (!user || !hasMore || isLoadingMore || !lastDoc) return;
    setIsLoadingMore(true);

    try {
      const postRef = collection(db, "posts");

      // Prefetch +1
      const q = query(
        postRef,
        where("userId", "==", user.uid),
        where("deleted", "==", true),
        orderBy("deletedAt", "desc"),
        startAfter(lastDoc),
        limit(POST_PER_PAGE + 1),
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        setHasMore(false);
        return;
      }

      const docs = snap.docs;
      const pageDocs = docs.slice(0, POST_PER_PAGE);

      if (pageDocs.length === 0) {
        setHasMore(false);
        return;
      }

      setLastDoc(pageDocs[pageDocs.length - 1]);
      setHasMore(docs.length > POST_PER_PAGE);

      const newPosts = pageDocs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          author,
          comments: data.comments || [],
        };
      });

      setDeletedPosts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        newPosts.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
    } catch (error) {
      console.error("Error loading more posts:", error);
      showErrorToast("Failed to load more posts.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Optimistic helper: remove from UI immediately
  const removeFromUI = (postId) => {
    setDeletedPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  // Restore: optimistic remove + rollback on failure
  const handleRestore = async (postId) => {
    if (!postId) return;

    const snapshot = deletedPosts.find((p) => p.id === postId) || null;
    removeFromUI(postId);

    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        deleted: false,
        deletedAt: null,
      });
      showSuccessToast("Post restored successfully!");
    } catch (err) {
      console.error("Error restoring post:", err);

      if (snapshot) {
        setDeletedPosts((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          map.set(snapshot.id, snapshot);
          return Array.from(map.values());
        });
      }

      showErrorToast("Failed to restore post.");
    }
  };

  // Permanent delete: optimistic remove + rollback on failure
  const handleDeletePermanent = async () => {
    if (!postIdToDelete) return;

    const snapshot = deletedPosts.find((p) => p.id === postIdToDelete) || null;
    removeFromUI(postIdToDelete);

    try {
      const deletePost = httpsCallable(functions, "deletePostCascade");
      await deletePost({ postId: postIdToDelete });
      showSuccessToast("Post permanently deleted.");
    } catch (error) {
      console.error("Delete error:", error);

      if (snapshot) {
        setDeletedPosts((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          map.set(snapshot.id, snapshot);
          return Array.from(map.values());
        });
      }

      showErrorToast("Failed to delete post.");
    } finally {
      setDeleteModalOpen(false);
      setPostIdToDelete(null);
    }
  };

  // Filter by days left
  const filteredPosts = filterRange
    ? deletedPosts.filter((post) => {
        const days = getDaysLeft(post.deletedAt);
        if (filterRange === "0-10") return days >= 0 && days <= 10;
        if (filterRange === "11-20") return days >= 11 && days <= 20;
        if (filterRange === "21-30") return days >= 21 && days <= 30;
        return true;
      })
    : deletedPosts;

  // Auto-fill: ako si ispraznio stranu (restore/delete), a ima jos, povuci sledece
  useEffect(() => {
    if (isLoading) return;
    if (isLoadingMore) return;
    if (!hasMore) return;
    if (!lastDoc) return;

    // Ako filterRange postoji, moguce je da je filteredPosts=0 ali deletedPosts>0 (nije "prazna strana")
    if (filterRange) {
      if (deletedPosts.length > 0) return;
    } else {
      if (filteredPosts.length > 0) return;
    }

    handleLoadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoading,
    isLoadingMore,
    hasMore,
    lastDoc,
    deletedPosts.length,
    filteredPosts.length,
    filterRange,
  ]);

  // EmptyState poruka (ne lazemo kad filter napravi 0)
  const shouldShowEmpty =
    !isLoading &&
    ((filterRange && deletedPosts.length === 0 && !hasMore) ||
      (!filterRange && filteredPosts.length === 0 && !hasMore));

  const emptyMessage =
    filterRange && deletedPosts.length > 0
      ? "No posts match this filter."
      : "You haven't deleted any posts yet.";

  return (
    <div className={shell}>
      <div className={wrap}>
        {shouldShowEmpty && <EmptyState message={emptyMessage} />}

        {isLoading && (
          <div className={gridBase} role="status" aria-live="polite">
            {Array.from({ length: 10 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!isLoading && filteredPosts.length > 0 && (
          <>
            <div className={gridBase}>
              <AnimatePresence>
                {filteredPosts.map((post) => {
                  const daysLeft = post.deletedAt
                    ? getDaysLeft(post.deletedAt)
                    : null;

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <PostCardTrash
                        post={post}
                        daysLeft={daysLeft}
                        onRestore={() => {
                          setSelectedPostId(post.id);
                          setRestoreModalOpen(true);
                        }}
                        onDeletePermanently={() => {
                          setPostIdToDelete(post.id);
                          setDeleteModalOpen(true);
                        }}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {isLoadingMore && (
              <div className={gridBase} role="status" aria-live="polite">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center pt-3">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore || !hasMore}
                  aria-busy={isLoadingMore}
                  aria-disabled={isLoadingMore || !hasMore}
                  className={`ui-button-primary ${
                    isLoadingMore ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}

            {!hasMore && filteredPosts.length > 0 && (
              <p
                className="mt-2 text-sm text-zinc-400 text-center"
                aria-live="polite"
              >
                You reached the end.
              </p>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={restoreModalOpen}
        title="Restore Post"
        message="Are you sure you want to restore this post?"
        confirmText="Restore"
        confirmButtonClass="rounded-lg bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25 hover:bg-emerald-500/25 hover:scale-105 transition"
        cancelButtonClass="rounded-lg bg-zinc-800/70 text-zinc-100 ring-1 ring-zinc-700/60 hover:bg-zinc-800 hover:scale-105 transition"
        onCancel={() => {
          setRestoreModalOpen(false);
          setSelectedPostId(null);
        }}
        onConfirm={() => {
          handleRestore(selectedPostId);
          setRestoreModalOpen(false);
          setSelectedPostId(null);
        }}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Post Permanently"
        message="Are you sure you want to permanently delete this post? This action cannot be undone."
        confirmText="Delete"
        confirmButtonClass="rounded-lg bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/25 hover:bg-rose-500/25 hover:scale-105 transition"
        cancelButtonClass="rounded-lg bg-zinc-800/70 text-zinc-100 ring-1 ring-zinc-700/60 hover:bg-zinc-800 hover:scale-105 transition"
        onCancel={() => {
          setDeleteModalOpen(false);
          setPostIdToDelete(null);
        }}
        onConfirm={handleDeletePermanent}
      />
    </div>
  );
};

export default Trash;
