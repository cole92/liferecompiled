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
import { functions } from "../../firebase";
import { db } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";
// Util funkcije i konstante
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";
import { showErrorToast, showSuccessToast } from "../../utils/toastUtils";
import ConfirmModal from "../../components/modals/ConfirmModal";
import { getDaysLeft } from "../../utils/dateUtils";
import { motion, AnimatePresence } from "framer-motion";
// Komponente
import PostCard from "../../components/PostCard";
import Spinner from "../../components/Spinner";

// Dashboard komponente
import EmptyState from "./components/EmptyState";

/**
 * Trash komponenta
 *
 * - Prikazuje sve korisnicke postove koji su oznaceni kao obrisani (`deleted === true`)
 * - Omogucava korisniku da postove vrati iz Trash-a putem potvrde (ConfirmModal)
 * - Real-time sinhronizacija sa Firestore-om kroz `onSnapshot`
 *
 * @component
 * @returns {JSX.Element} UI prikaz obrisanih postova sa opcijom za Restore
 */

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

  const author = {
    id: user.uid,
    name: user.name || "Anonymous",
    profilePicture: user.profilePicture || DEFAULT_PROFILE_PICTURE,
  };

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
        const q = query(
          postRef,
          where("userId", "==", user.uid),
          where("deleted", "==", true),
          orderBy("deletedAt", "desc"),
          limit(POST_PER_PAGE)
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setDeletedPosts([]);
          setHasMore(false);
          return;
        }
        if (canceled) return;

        setLastDoc(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.size === POST_PER_PAGE);

        const posts = snap.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            ...data,
            author,
            comments: data.comments || [],
          };
        });
        setDeletedPosts(posts);
      } catch (error) {
        console.error("Error fetching posts:", error);
        if (!canceled)
          showErrorToast("Failed to load your posts. Please try again.");
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    if (user?.uid) {
      fetchFirstPage();
    }

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLoadMore = async () => {
    if (!user || !hasMore || isLoadingMore || !lastDoc) return;
    setIsLoadingMore(true);

    try {
      const postRef = collection(db, "posts");
      const q = query(
        postRef,
        where("userId", "==", user.uid),
        where("deleted", "==", true),
        orderBy("deletedAt", "desc"),
        startAfter(lastDoc),
        limit(POST_PER_PAGE)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setHasMore(false);
        return;
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.size === POST_PER_PAGE);

      const newPosts = snap.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
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

  // Vraca post iz Trash-a tako sto resetuje `deleted` i `deletedAt` polja
  const handleRestore = async (postId) => {
    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        deleted: false,
        deletedAt: null,
      });
      showSuccessToast("Post restored successfully!");
    } catch (err) {
      console.error("Error restoring post:", err);
      showErrorToast("Failed to restore post.");
    }
  };
  // Poziva Cloud Function `deletePostCascade` za trajno brisanje posta
  const handleDeletePermanent = async () => {
    if (!postIdToDelete) return;

    try {
      const deletePost = httpsCallable(functions, "deletePostCascade");
      await deletePost({ postId: postIdToDelete });
      showSuccessToast("Post permanently deleted.");
    } catch (error) {
      console.error("Delete error:", error);
      showErrorToast("Failed to delete post.");
    } finally {
      setDeleteModalOpen(false);
      setPostIdToDelete(null);
    }
  };

  // Ako je aktivan filter (npr. "0-10"), prikazujemo samo postove ciji broj dana do brisanja upada u taj raspon
  const filteredPosts = filterRange
    ? deletedPosts.filter((post) => {
        const days = getDaysLeft(post.deletedAt);
        if (filterRange === "0-10") return days >= 0 && days <= 10;
        if (filterRange === "11-20") return days >= 11 && days <= 20;
        if (filterRange === "21-30") return days >= 21 && days <= 30;
        return true;
      })
    : deletedPosts;

  // UI prikaz: loading, empty state ili lista obrisanih postova
  return (
    <div>
      {/* Empty state */}
      {!isLoading && deletedPosts.length === 0 && (
        <EmptyState message="You haven't deleted any posts yet." />
      )}
      {/* Loading state */}
      {isLoading && <Spinner message="Loading deleted posts..." />}

      {!isLoading && deletedPosts.length > 0 && (
        <div className="grid gap-4">
          <AnimatePresence>
            {/* Prikaz liste obrisanih postova sa opcijama za Restore i Delete */}
            {filteredPosts.map((post) => {
              const daysLeft = post.deletedAt // Izracunavamo koliko dana je ostalo do isteka roka za restore
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
                  <PostCard
                    post={post}
                    isTrashMode={true}
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
      )}
      {/* Modal koji potvrdjuje da korisnik zeli da restore-uje post */}
      <ConfirmModal
        isOpen={restoreModalOpen}
        title="Restore Post"
        message="Are you sure you want to restore this post?"
        confirmText="Restore"
        confirmButtonClass="bg-green-500 hover:bg-green-600 hover:scale-105 transition duration-200"
        cancelButtonClass="bg-gray-300 text-gray-800 hover:bg-gray-400 hover:scale-105 transition duration-200"
        onCancel={() => setRestoreModalOpen(false)}
        onConfirm={() => {
          handleRestore(selectedPostId);
          setRestoreModalOpen(false);
          setSelectedPostId(null);
        }}
      />
      {/* Modal koji potvrdjuje trajno brisanje posta */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Post Permanently"
        message="Are you sure you want to permanently delete this post? This action cannot be undone."
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700 hover:scale-105 transition duration-200"
        cancelButtonClass="bg-gray-300 text-gray-800 hover:bg-gray-400 hover:scale-105 transition duration-200"
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={handleDeletePermanent}
      />
    </div>
  );
};

export default Trash;
