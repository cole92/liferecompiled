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
      showInfoToast("Please login to react 😊", { toastId: "react:auth" });
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

  const likeBtnDisabled = locked;

  return (
    <div className="inline-flex items-center gap-2">
      {/* Dugme za like */}
      <button
        type="button"
        onClick={handleLike}
        disabled={likeBtnDisabled}
        aria-disabled={likeBtnDisabled}
        className={`inline-flex items-center gap-1 rounded-md p-1 transition
          focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
          ${
            likeBtnDisabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-zinc-900/40"
          }`}
        title={locked ? "Reactions are locked" : liked ? "Unlike" : "Like"}
      >
        {liked ? (
          <FaHeart className="text-rose-500" />
        ) : (
          <FaRegHeart className="text-zinc-300" />
        )}
      </button>

      {/* Poruka ako nema lajkova */}
      {likeCount === 0 && (
        <p className="text-sm text-zinc-500 italic">
          No one has liked this comment yet.
        </p>
      )}

      {/* Otvori modal ako postoji makar jedan lajk */}
      {likeCount > 0 && (
        <button
          type="button"
          onClick={handleOpenLikesModal}
          className="text-sm text-zinc-300 hover:text-zinc-100 hover:underline"
          title={likeText}
        >
          {likeText}
        </button>
      )}

      {/* Modal sa listom korisnika */}
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

CommentReaction.propTypes = {
  commentId: PropTypes.string.isRequired,
  currentUserId: PropTypes.string,
  locked: PropTypes.bool,
};

export default CommentReaction;
