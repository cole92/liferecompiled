import { useContext, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";

import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";
import ConfirmModal from "../components/modals/ConfirmModal";

import SkeletonCard from "../components/ui/skeletonLoader/SkeletonCard";
import PostsList from "../components/PostsList";
import PostCardDashboard from "../components/PostCardDashboard";

import EmptyState from "./dashboard/components/EmptyState";
import buildPostsQuery from "../services/postsService";

/**
 * @component MyPosts
 *
 * Dashboard page for managing the current user's posts.
 * - Fetches paginated post lists from Firestore with server-side search support
 * - Applies client-side "active/locked/all" view filtering (when not in search mode)
 * - Supports soft delete (move to Trash) and manual lock (archive) via transactions
 *
 * UI notes:
 * - Uses dashboard header controls from `DashboardLayout` (tabs + filters/search via Outlet context)
 * - Uses `PostsList` with `PostCardDashboard` for consistent card rendering
 *
 * @returns {JSX.Element}
 */
const MyPosts = () => {
  const { user } = useContext(AuthContext);
  const { filter, myPostsSearch } = useOutletContext();

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [postToLock, setPostToLock] = useState(null);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const POST_PER_PAGE = 10;

  const rawSearch = myPostsSearch || "";
  const [debouncedSearch, setDebouncedSearch] = useState(rawSearch.trim());

  useEffect(() => {
    // Debounce search input so we do not re-query Firestore on every keystroke.
    // Keeps the UI responsive and reduces read volume.
    const trimmed = rawSearch.trim();

    if (trimmed === "") {
      setDebouncedSearch("");
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedSearch(trimmed);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [rawSearch]);

  const trimmedSearch = debouncedSearch;

  useEffect(() => {
    let canceled = false;

    const fetchPosts = async () => {
      // Reset pagination state on any filter/search change to keep cursors valid.
      setPosts([]);
      setLastDoc(null);
      setHasMore(true);
      setIsLoading(true);
      setIsLoadingMore(false);

      try {
        const q = buildPostsQuery({
          userId: user.uid,
          filter,
          afterDoc: null,
          pageSize: POST_PER_PAGE + 1, // prefetch +1 to avoid showing "Load more" when exact page size
          q: trimmedSearch,
        });

        const querySnapshot = await getDocs(q);
        if (canceled) return;

        if (querySnapshot.empty) {
          setPosts([]);
          setHasMore(false);
          return;
        }

        // Author snapshot is embedded into cards so UI can render consistently
        // even if post docs do not include denormalized author fields.
        const author = {
          id: user.uid,
          name: user.name || "Unknown author",
          profilePicture: user.profilePicture || DEFAULT_PROFILE_PICTURE,
          badges: user.badges || {},
        };

        const docs = querySnapshot.docs;
        const pageDocs = docs.slice(0, POST_PER_PAGE);

        if (pageDocs.length === 0) {
          setPosts([]);
          setHasMore(false);
          return;
        }

        const userPosts = pageDocs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            author,
            comments: data.comments || [],
          };
        });

        setPosts(userPosts);
        setLastDoc(pageDocs[pageDocs.length - 1]);
        setHasMore(docs.length > POST_PER_PAGE);
      } catch (error) {
        console.error("Error fetching posts:", error);
        if (!canceled) {
          showErrorToast("Failed to load your posts. Please try again.");
        }
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    if (user?.uid) fetchPosts();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, filter, trimmedSearch]);

  const handleLoadMore = async () => {
    if (!user || !hasMore || isLoadingMore || !lastDoc) return;
    setIsLoadingMore(true);

    try {
      const q = buildPostsQuery({
        userId: user.uid,
        filter,
        afterDoc: lastDoc,
        pageSize: POST_PER_PAGE + 1, // prefetch +1 for accurate `hasMore`
        q: trimmedSearch,
      });

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setHasMore(false);
        return;
      }

      const author = {
        id: user.uid,
        name: user.name || "Unknown author",
        profilePicture: user.profilePicture || DEFAULT_PROFILE_PICTURE,
        badges: user.badges || {},
      };

      const docs = querySnapshot.docs;
      const pageDocs = docs.slice(0, POST_PER_PAGE);

      if (pageDocs.length === 0) {
        setHasMore(false);
        return;
      }

      const newPosts = pageDocs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        author,
        comments: docSnap.data().comments || [],
      }));

      // De-dup by id to stay stable if Firestore returns overlaps across pages.
      setPosts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        newPosts.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });

      setLastDoc(pageDocs[pageDocs.length - 1]);
      setHasMore(docs.length > POST_PER_PAGE);
    } catch (error) {
      console.error("Error loading more posts:", error);
      showErrorToast("Failed to load more posts.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDelete = async (postId) => {
    try {
      // Transaction prevents races (e.g., double delete or state changed by another client).
      await runTransaction(db, async (tx) => {
        const postRef = doc(db, "posts", postId);
        const snapshot = await tx.get(postRef);

        if (!snapshot.exists()) throw new Error("Post does not exist.");
        if (snapshot.data().deleted) throw new Error("Already deleted.");

        tx.update(postRef, {
          deleted: true,
          deletedAt: serverTimestamp(),
        });
      });

      showSuccessToast("Post moved to Trash.");

      // Optimistic UI: remove immediately after success to keep list snappy.
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      console.error("Error during soft delete:", error);
      showErrorToast("Failed to delete post.");
    } finally {
      setIsModalOpen(false);
      setPostToDelete(null);
    }
  };

  const handleLock = async (postId) => {
    try {
      // Transaction keeps lock operation idempotent and avoids stale writes.
      await runTransaction(db, async (transaction) => {
        const postRef = doc(db, "posts", postId);
        const snapshot = await transaction.get(postRef);
        if (!snapshot.exists()) throw new Error("Post not found!");

        const data = snapshot.data();
        if (data.locked) throw new Error("Already locked");

        transaction.update(postRef, {
          locked: true,
          lockedAt: serverTimestamp(),
        });
      });

      setPostToLock(null);
      setIsLockModalOpen(false);
      showSuccessToast("Post successfully arhived.");

      // Update local cache so the UI reflects "locked" without refetching.
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                locked: true,
                lockedAt: Timestamp.fromDate(new Date()),
              }
            : post,
        ),
      );
    } catch (error) {
      console.error("Locking error", error);
      showErrorToast(error?.message || "Failed to lock post.");
    }
  };

  // Filter mode is client-side and only affects the current in-memory list.
  // Search mode uses server-side query, so we do not apply extra client filtering.
  const filteredPosts = posts.filter((post) => {
    if (filter === "active") return !post.locked;
    if (filter === "locked") return post.locked;
    return true;
  });

  const isSearchMode = trimmedSearch.length > 0;
  const visiblePosts = isSearchMode ? posts : filteredPosts;

  useEffect(() => {
    // Auto-fill: if current page becomes empty (e.g., after delete/lock),
    // and there are more pages, pull the next page to avoid a blank grid.
    if (isLoading) return;
    if (isLoadingMore) return;
    if (!hasMore) return;
    if (!lastDoc) return;
    if (visiblePosts.length > 0) return;

    handleLoadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isLoadingMore, hasMore, lastDoc, visiblePosts.length]);

  const gridClassName =
    "grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 items-stretch";

  return (
    <div className="pb-2">
      {!isLoading && visiblePosts.length === 0 && !hasMore && (
        <EmptyState
          message={
            isSearchMode
              ? "No posts match your search."
              : "You haven't created any posts yet."
          }
        />
      )}

      {!isLoading && visiblePosts.length > 0 && (
        <PostsList
          posts={visiblePosts}
          isMyPost={true}
          showDeleteButton={true}
          showCommentsThread={false}
          gridClassName={gridClassName}
          CardComponent={PostCardDashboard}
          onDelete={(postId) => {
            setPostToDelete(postId);
            setIsModalOpen(true);
          }}
          onLock={(postId) => {
            setPostToLock(postId);
            setIsLockModalOpen(true);
          }}
        />
      )}

      {isLoading && (
        <div className={gridClassName} role="status" aria-live="polite">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isLoadingMore && (
        <div className="mt-4" role="status" aria-live="polite">
          <SkeletonCard />
        </div>
      )}

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore || !hasMore}
            aria-busy={isLoadingMore}
            aria-disabled={isLoadingMore || !hasMore}
            className="ui-button-primary py-2.5"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}

      {!hasMore && visiblePosts.length > 0 && (
        <p className="ui-help text-center mt-6" aria-live="polite">
          You reached the end.
        </p>
      )}

      <ConfirmModal
        isOpen={isModalOpen}
        title="Delete Post?"
        message="Are you sure you want to delete this post? It will be moved to Trash and can be restored within 30 days."
        onCancel={() => {
          setIsModalOpen(false);
          setPostToDelete(null);
        }}
        onConfirm={() => handleDelete(postToDelete)}
      />

      <ConfirmModal
        isOpen={isLockModalOpen}
        title="Archive Post?"
        confirmText={"Archive"}
        message="Are you sure you want to archive this post? You won't be able to edit or comment anymore."
        onCancel={() => {
          setIsLockModalOpen(false);
          setPostToLock(null);
        }}
        onConfirm={() => {
          handleLock(postToLock);
          setIsLockModalOpen(false);
          setPostToLock(null);
        }}
      />
    </div>
  );
};

export default MyPosts;
