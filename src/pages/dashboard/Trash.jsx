// Paketi
import { useContext, useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
// Konfiguracija i kontekst
import { db } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";
// Util funkcije i konstante
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";
import { showErrorToast, showSuccessToast } from "../../utils/toastUtils";
import ConfirmModal from "../../utils/ConfirmModal";
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
  const [deletedPosts, setDeletedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);

  // Subscribujemo se na real-time promene za obrisane postove korisnika
  useEffect(() => {
    let unsubscribe;

    if (user?.uid) {
      const postRef = collection(db, "posts");
      const q = query(
        postRef,
        where("userId", "==", user.uid),
        where("deleted", "==", true),
        orderBy("createdAt", "desc")
      );

      const author = {
        name: user.name || "Anonymous",
        profilePicture: user.profilePicture || DEFAULT_PROFILE_PICTURE,
      };
      // Mapiramo svaki dokument u post objekat sa autorom iz AuthContext
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const posts = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              author,
              comments: data.comments || [],
            };
          });
          setDeletedPosts(posts);
          setIsLoading(false);
        },
        (error) => {
          console.error("Error with real-time subscription:", error);
          showErrorToast("Failed to load deleted posts.");
          setIsLoading(false);
        }
      );
    }

    // Cleanup funkcija
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

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
          {deletedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isTrashMode={true}
              onRestore={() => {
                setSelectedPostId(post.id);
                setRestoreModalOpen(true);
              }}
            />
          ))}
        </div>
      )}
      {/* Modal koji potvrdjuje da korisnik zeli da restore-uje post */}
      <ConfirmModal
        isOpen={restoreModalOpen}
        title="Restore Post"
        message="Are you sure you want to restore this post?"
        confirmText="Restore"
        confirmButtonClass="bg-green-500 hover:bg-green-600"
        onCancel={() => setRestoreModalOpen(false)}
        onConfirm={() => {
          handleRestore(selectedPostId);
          setRestoreModalOpen(false);
          setSelectedPostId(null);
        }}
      />
    </div>
  );
};

export default Trash;
