import PropTypes from "prop-types";
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { getUserById } from "../../services/userService";
import { db } from "../../firebase";
import { useEffect, useState } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import LikesModal from "../modals/LikesModal";
import { showInfoToast } from "../../utils/toastUtils";

/**
 * @component CommentReaction
 * Komponenta za prikaz i upravljanje lajkovima na komentaru.
 *
 * - Real-time sync sa Firestore `likes` poljem
 * - Prikazuje do 3 najnovija korisnika koji su lajkovali komentar
 * - Klik na lajk dugme dodaje/uklanja korisnika iz Firestore niza
 * - Otvara modal sa celokupnom listom korisnika koji su lajkovali
 *
 * @param {string} commentId - ID komentara nad kojim se vrsi akcija
 * @param {string} currentUserId - ID trenutno prijavljenog korisnika
 * @param {boolean} [locked=false] - Onemogucava lajk interakciju ako je komentar zakljucan
 *
 * @returns {JSX.Element} Interfejs za reakcije na komentar
 */

const CommentReaction = ({ commentId, currentUserId, locked = false }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeList, setLikeList] = useState([]);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [topLikers, setTopLikers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // Real-time listener za Firestore polje 'likes'
  useEffect(() => {
    const ref = doc(db, "comments", commentId);

    const unsubscribe = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        setLiked(false);
        setLikeCount(0);
        setLikeList([]);
        setTopLikers([]);
        return;
      }

      const likesArray = snap.data().likes || [];

      setLiked(likesArray.includes(currentUserId));
      setLikeCount(likesArray.length);
      setLikeList(likesArray);

      // Ucitaj do 3 najnovija korisnika
      const idsToShow =
        likesArray.length <= 3 ? likesArray : likesArray.slice(-3);

      if (idsToShow.length > 0) {
        const users = await Promise.all(idsToShow.map(getUserById));
        setTopLikers(users);
      } else {
        setTopLikers([]);
      }
    });

    return () => unsubscribe();
  }, [commentId, currentUserId]);

  // Klik na srce: dodaj/ukloni lajk
  const handleLike = async () => {
    if (!currentUserId) {
      showInfoToast("Please login to react 😊");
      return;
    }

    if (locked) return;

    const ref = doc(db, "comments", commentId);

    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await updateDoc(ref, { likes: arrayRemove(currentUserId) });
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await updateDoc(ref, { likes: arrayUnion(currentUserId) });
    }
  };

  // Otvara modal i ucitava sve korisnike koji su lajkovali komentar
  const handleOpenLikesModal = async () => {
    try {
      setVisibleCount(10);
      setShowLikesModal(true);
      setLoadingUsers(true);
      const users = await Promise.all(likeList.map(getUserById));
      await new Promise((resolve) => setTimeout(resolve, 500)); // Vestacko kasnjenje radi estetike
      setTopLikers(users);
    } catch (err) {
      console.error("Error loading user:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Tekst koji se prikazuje pored ikone srca
  const otherCount = liked ? likeCount - 1 : likeCount;
  let likeText = "";

  if (liked) {
    if (otherCount === 0) {
      likeText = "You";
    } else if (otherCount === 1) {
      likeText = "You and 1 other";
    } else {
      likeText = `You and ${otherCount} others`;
    }
  } else {
    likeText =
      likeCount === 1
        ? "1 person liked this"
        : `${likeCount} people liked this`;
  }

  return (
    <div>
      {/* Glavna sekcija: dugme za lajk + tekst */}
      <div className="flex items-center space-x-2">
        <button onClick={handleLike} className="flex items-center space-x-1">
          {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
        </button>

        {/* Poruka ako nema lajkova */}
        {likeCount === 0 && (
          <p className="text-sm text-gray-500 italic">
            No one has liked this comment yet.
          </p>
        )}

        {/* Otvori modal ako postoji makar jedan lajk */}
        {likeCount > 0 && (
          <button
            onClick={handleOpenLikesModal}
            className="text-sm text-gray-700 hover:underline cursor-pointer"
            title={likeText}
          >
            {likeText}
          </button>
        )}
      </div>

      {/* Modal sa listom korisnika (portal modal) */}
      <LikesModal
        isOpen={showLikesModal}
        onClose={() => {
          setShowLikesModal(false);
          setTopLikers([]);
          setVisibleCount(10);
          setLoadingUsers(false);
        }}
        users={topLikers}
        loading={loadingUsers}
        visibleCount={visibleCount}
        onLoadMore={() => setVisibleCount((v) => v + 10)}
      />
    </div>
  );
};

// PropTypes
CommentReaction.propTypes = {
  commentId: PropTypes.string.isRequired,
  currentUserId: PropTypes.string,
  locked: PropTypes.bool,
};

export default CommentReaction;
