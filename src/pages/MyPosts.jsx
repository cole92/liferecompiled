// Paketi
import { useContext, useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// Konfiguracija i kontekst
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";

// Util funkcije i konstante
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";
import ConfirmModal from "../components/modals/ConfirmModal";

// Komponente
import SkeletonCard from "../components/ui/skeletonLoader/SkeletonCard";
import PostsList from "../components/PostsList";

// Dashboard komponente
import EmptyState from "./dashboard/components/EmptyState";
import buildPostsQuery from "../services/postsService";

/**
 * @component MyPosts
 *
 * Dashboard lista postova trenutnog korisnika sa filterima, paginacijom i akcijama.
 *
 * - Ucitava postove preko buildPostsQuery (filter: all/active/locked)
 * - Paginacija pomocu startAfter kursora i "Load more"
 * - Soft delete: postavlja deleted:true i deletedAt (serverTimestamp)
 * - Lock: postavlja locked:true i lockedAt (serverTimestamp)
 * - Lokalni state odmah reflektuje promene (bez refetch-a)
 *
 * @returns {JSX.Element}
 */

// Dashboard komponenta za prikaz podataka korisnika
const MyPosts = () => {
  const { user } = useContext(AuthContext);
  const { filter, myPostsSearch } = useOutletContext();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal stanja za delete i lock
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [postToLock, setPostToLock] = useState(null);

  // Paginacija
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const POST_PER_PAGE = 10;

  // Debounce
  const rawSearch = myPostsSearch || "";
  const [debouncedSearch, setDebouncedSearch] = useState(rawSearch.trim());

  useEffect(() => {
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

    // Dohvata postove za trenutnog user-a po izabranom filteru (resetuje paginaciju)
    const fetchPosts = async () => {
      // Reset stanja kada se promeni filter ili user
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
          pageSize: POST_PER_PAGE,
          q: trimmedSearch,
        });

        const querySnapshot = await getDocs(q);
        if (canceled) return;

        if (querySnapshot.empty) {
          setPosts([]);
          setHasMore(false);
          return;
        }

        // Uzimamo najnovije podatke o autoru iz AuthContext (bez dodatnih upita)
        const author = {
          id: user.uid,
          name: user.name || "Unknown author",
          profilePicture: user.profilePicture || DEFAULT_PROFILE_PICTURE,
        };

        // Mapiranje dokumenata + fallback za comments
        const userPosts = querySnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            author,
            comments: data.comments || [],
          };
        });

        setPosts(userPosts);

        // Podesi kursor i indikator da li ima jos rezultata
        setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.size === POST_PER_PAGE);
      } catch (error) {
        console.error("Error fetching posts:", error);
        if (!canceled)
          showErrorToast("Failed to load your posts. Please try again.");
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    if (user?.uid) {
      fetchPosts();
    }
    return () => {
      canceled = true; // Cleanup: sprecava setState posle unmount-a
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, filter, trimmedSearch]);

  // Dovlaci sledecu stranicu postova (paginacija)
  const handleLoadMore = async () => {
    if (!user || !hasMore || isLoadingMore || !lastDoc) return;
    setIsLoadingMore(true);

    try {
      const q = buildPostsQuery({
        userId: user.uid,
        filter,
        afterDoc: lastDoc,
        pageSize: POST_PER_PAGE,
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
      };

      const newPosts = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        author,
        comments: docSnap.data().comments || [],
      }));

      // Merge bez duplikata: novi pregaze stare sa istim id-om
      setPosts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        newPosts.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });

      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);

      // Ako je stiglo manje od page size, nema vise podataka
      if (querySnapshot.size < POST_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
      showErrorToast("Failed to load more posts.");
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Soft-delete:
  // - Transakcija radi integriteta (sprecava dvoklik i race)
  // - Podesi deleted:true i deletedAt
  // - Lokalno ukloni post iz liste bez refetch-a
  const handleDelete = async (postId) => {
    try {
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
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      console.error("Error during soft delete:", error);
      showErrorToast("Failed to delete post.");
    } finally {
      setIsModalOpen(false);
      setPostToDelete(null);
    }
  };

  /**
   * @function handleLock
   * Zakljucava post transakcijom: postavlja `locked:true` i `lockedAt`.
   * Lokalni state se azurira odmah da UI ne ceka refetch.
   * @param {string} postId - ID posta koji se zakljucava
   */
  const handleLock = async (postId) => {
    try {
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
      showSuccessToast("Post successfully locked.");

      // Lokalno oznaci da je post zakljucan (instant feedback)
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                locked: true,
                lockedAt: Timestamp.fromDate(new Date()),
              }
            : post
        )
      );
    } catch (error) {
      console.error("Locking error", error);
      showErrorToast(error?.message || "Failed to lock post.");
    }
  };

  // Klijentska filtracija prema aktivnom filteru iz outlet context-a
  const filteredPosts = posts.filter((post) => {
    if (filter === "active") return !post.locked;
    if (filter === "locked") return post.locked;
    return true; // all
  });

  const isSearchMode = trimmedSearch.length > 0;
  const visiblePosts = isSearchMode ? posts : filteredPosts;

  // Prikaz korisnickog interfejsa
  return (
    <div className="mb-6">
      {/* Pozdravna poruka i dugme za dodavanje posta */}
      <h2 className="text-2xl font-semibold mb-2">
        Welcome, {user ? user.email : "Guest"}
      </h2>
      <button
        onClick={() => navigate("/dashboard/create")}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Create New Post
      </button>

      {/* Empty state */}
      {!isLoading && visiblePosts.length === 0 && (
        <EmptyState
          message={
            isSearchMode
              ? "No posts match your search."
              : "You haven't created any posts yet."
          }
        />
      )}

      {/* Lista postova sa mogucnoscu brisanja i zakljucavanja (samo za vlasnika) */}
      {!isLoading && visiblePosts.length > 0 && (
        <PostsList
          posts={visiblePosts}
          isMyPost={true}
          showDeleteButton={true}
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
        <div className="grid gap-4" role="status" aria-live="polite">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Loading more (mini skeletoni) */}
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
      {!hasMore && visiblePosts.length > 0 && (
        <p
          className="mt-4 text-sm text-gray-500 text-center"
          aria-live="polite"
        >
          You reached the end.
        </p>
      )}

      {/* Modal za potvrdu brisanja posta */}
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

      {/* Modal za potvrdu zakljucavanja posta (locked state) */}
      <ConfirmModal
        isOpen={isLockModalOpen}
        title="Lock Post?"
        confirmText={"Lock"}
        message="Are you sure you want to lock this post? It will be archived and you wont be able to edit or comment anymore."
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
