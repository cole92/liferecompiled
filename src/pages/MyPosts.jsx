// Paketi
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  Timestamp,
} from "firebase/firestore";
// Konfiguracija i kontekst
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
// Util funkcije i konstante
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { showErrorToast, showSuccessToast } from "../utils/toastUtils";
import ConfirmModal from "../utils/ConfirmModal";
// Komponente
import Spinner from "../components/Spinner";
import PostsList from "../components/PostsList";
// Dashboard komponente
import EmptyState from "./dashboard/components/EmptyState";

// Dashboard komponenta za prikaz podataka korisnika
const MyPosts = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [postToLock, setPostToLock] = useState(null);

  useEffect(() => {
    // Funkcija za dohvatanje postova korisnika iz Firestore baze koji nisu obrisani
    const fetchPosts = async () => {
      try {
        const postRef = collection(db, "posts");
        const q = query(
          postRef,
          where("userId", "==", user.uid),
          where("deleted", "==", false), // Dohvatamo samo postove koji nisu oznaceni kao obrisani
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        // Uzimamo uvek najnovije korisnicke podatke iz AuthContext
        const author = {
          name: user.name || "Anonymous",
          profilePicture: user.profilePicture || DEFAULT_PROFILE_PICTURE,
        };

        // Mapiramo svaki dokument:
        // - Dodajemo author iz AuthContext (bez dodatnih poziva ka Firestore)
        // - Dodajemo fallback za comments ako nije definisan
        const userPosts = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            author,
            comments: data.comments || [], // default na prazan niz
          };
        });

        setPosts(userPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
        showErrorToast("Failed to load your posts. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.uid) {
      fetchPosts();
    }
  }, [user]);

  // Soft-delete funkcija za post:
  // - Pokrece Firestore transakciju da osigura integritet (npr. dvoklik / race conditions)
  // - Postavlja `deleted: true` i `deletedAt` (timestamp) u dokumentu
  // - Nakon uspeha, uklanja post iz lokalnog state-a i prikazuje toast
  // - U slucaju greske, prikazuje error toast i resetuje modal
  const handleDelete = async (postId) => {
    try {
      await runTransaction(db, async (tx) => {
        const postRef = doc(db, "posts", postId);
        const snapshot = await tx.get(postRef);
        if (!snapshot.exists()) throw "Post does not exist.";
        if (snapshot.data().deleted) throw "Already deleted.";

        tx.update(postRef, {
          deleted: true,
          deletedAt: serverTimestamp(),
        });
      });
      showSuccessToast("Post moved to Trash.");
      setPosts((prev) => prev.filter((p) => p.id !== postId)); // Lokalno uklanjamo post iz prikaza (ne refetchujemo celu listu)
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
   * Zakljucava post tako sto azurira njegovo stanje u Firestore.
   * - Pokrece transakciju da postavi `locked: true` i `lockedAt`.
   * - Zatvara modal i prikazuje success toast.
   * @param {string} postId - ID posta koji se zakljucava.
   */

  const handleLock = async (postId) => {
    try {
      await runTransaction(db, async (transaction) => {
        const postRef = doc(db, "posts", postId);
        const snapshot = await transaction.get(postRef);
        if (!snapshot.exists()) throw "Post not found!";

        const data = snapshot.data();
        if (data.locked) throw "Already locked";

        transaction.update(postRef, {
          locked: true,
          lockedAt: serverTimestamp(),
        });
      });
      setPostToLock(null);
      setIsLockModalOpen(false);
      showSuccessToast("Post successfully locked.");

      // Azuriramo lokalni state da odmah reflektuje zakljucavanje bez ponovnog fetch-a
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

      {/* Loading state */}
      {isLoading && <Spinner message="Loading your posts..." />}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <EmptyState message="You haven't created any posts yet." />
      )}

      {/* Lista postova sa mogucnoscu brisanja i zakljucavanja (samo za vlasnika) */}
      {!isLoading && posts.length > 0 && (
        <PostsList
          posts={posts}
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
