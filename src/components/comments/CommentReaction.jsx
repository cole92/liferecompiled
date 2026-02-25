// src/components/comments/CommentReaction.jsx
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
 *
 * Compact like/reaction control for a single comment (IG-like, low visual noise).
 *
 * - Subscribes to comment doc (`likes` array) for real-time count + current user state.
 * - Uses optimistic UI updates to keep the button responsive.
 * - Loads a small "top likers" preview (up to 3 most recent) as a lightweight hint.
 * - Opens a modal to view the full liker list (best-effort user fetch).
 *
 * @param {string} commentId - Target comment document id.
 * @param {string|null} currentUserId - Logged-in user id (null for guests).
 * @param {boolean} locked - If true, disables all reactions (read-only mode).
 * @returns {JSX.Element}
 */
const CommentReaction = ({ commentId, currentUserId, locked = false }) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeList, setLikeList] = useState([]);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [topLikers, setTopLikers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // Real-time listener for `likes` array to keep UI in sync across clients.
  useEffect(() => {
    const ref = doc(db, "comments", commentId);

    const unsubscribe = onSnapshot(ref, async (snap) => {
      // Deleted/missing doc: reset derived UI state to avoid stale info.
      if (!snap.exists()) {
        setLiked(false);
        setLikeCount(0);
        setLikeList([]);
        setTopLikers([]);
        return;
      }

      const likesArray = snap.data().likes || [];

      setLiked(!!currentUserId && likesArray.includes(currentUserId));
      setLikeCount(likesArray.length);
      setLikeList(likesArray);

      // Lightweight preview: show up to 3 newest likers (best-effort).
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

  const handleLike = async () => {
    // Guest gate: keep UX friendly and dedupe via toastId.
    if (!currentUserId) {
      showInfoToast("Please login to react 😊", { toastId: "react:auth" });
      return;
    }

    if (locked) return;

    const ref = doc(db, "comments", commentId);

    // Optimistic UI: adjust local state immediately, then persist to Firestore.
    if (liked) {
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
      await updateDoc(ref, { likes: arrayRemove(currentUserId) });
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await updateDoc(ref, { likes: arrayUnion(currentUserId) });
    }
  };

  const handleOpenLikesModal = async () => {
    try {
      // Reset paging each time the modal is opened for a consistent UX.
      setVisibleCount(10);
      setShowLikesModal(true);
      setLoadingUsers(true);

      // Best-effort: resolve user docs for ids in the likes array.
      const users = await Promise.all(likeList.map(getUserById));
      setTopLikers(users);
    } catch (err) {
      console.error("Error loading user:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // "You and X others" uses a separate count so copy stays correct when current user liked.
  const otherCount = liked ? likeCount - 1 : likeCount;

  let likeText = "";
  if (liked) {
    if (otherCount === 0) likeText = "You";
    else if (otherCount === 1) likeText = "You and 1 other";
    else likeText = `You and ${otherCount} others`;
  } else {
    likeText = likeCount === 1 ? "1 like" : `${likeCount} likes`;
  }

  const likeBtnDisabled = locked;

  return (
    <div className="inline-flex items-center gap-2 min-w-0">
      <button
        type="button"
        onClick={handleLike}
        disabled={likeBtnDisabled}
        aria-disabled={likeBtnDisabled}
        className={`inline-flex items-center gap-1 rounded-md p-1 transition
          focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
          ${likeBtnDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-900/40"}`}
        title={locked ? "Reactions are locked" : liked ? "Unlike" : "Like"}
      >
        {liked ? (
          <FaHeart className="text-rose-500" />
        ) : (
          <FaRegHeart className="text-zinc-300" />
        )}
      </button>

      {likeCount > 0 && (
        <button
          type="button"
          onClick={handleOpenLikesModal}
          className="text-xs text-zinc-300 hover:text-zinc-100 hover:underline underline-offset-4 truncate max-w-[12rem] sm:max-w-[16rem]"
          title={likeText}
        >
          {likeText}
        </button>
      )}

      <LikesModal
        isOpen={showLikesModal}
        onClose={() => {
          // Clear modal-related state on close to avoid stale data next open.
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
