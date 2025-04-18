import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { motion } from "framer-motion";

import { auth } from "../../firebase";
import { deleteComment } from "../../firebase/functions";
import { getUserById } from "../../services/userService";
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

import CommentForm from "./CommentForm";
import CommentReaction from "./CommentReaction";
import ConfirmModal from "../../utils/ConfirmModal";

/**
 * Komponenta za prikaz jednog komentara sa korisnickim informacijama.
 *
 * Prikazuje odgovore (replies), omogucava odgovaranje i brisanje komentara.
 * Dohvata korisnicke podatke (ime i sliku) iz Firestore-a pomocu `getUserById`.
 * Ugradjena animacija prikaza koristi framer-motion.
 *
 * @component
 * @param {string} userId - ID korisnika koji je ostavio komentar.
 * @param {string} content - Tekst komentara.
 * @param {firebase.firestore.Timestamp} timestamp - Firestore timestamp objekat.
 * @param {string} postID - ID posta na koji komentar pripada.
 * @param {string} commentId - ID ovog komentara.
 * @param {Array<Object>} comments - Lista svih komentara za dati post (za pronalazenje odgovora).
 * @param {number} [depth=0] - Trenutna dubina komentara; koristi se za uvlacenje i ogranicenje rekurzije.
 */

dayjs.extend(relativeTime);

const CommentItem = ({
  userId,
  content,
  timestamp,
  postID,
  commentId,
  comments,
  depth = 0,
}) => {
  const [user, setUser] = useState(null);                           // State za podatke korisnika
  const [isReplaying, setIsReplaying] = useState(false);            // State za kontrolu prikaza forme za odgovor
  const [showConfirmModal, setShowConfirmModal] = useState(false);  // State za prikaz modala za potvrdu brisanja
  const [isDeleting, setIsDeleting] = useState(false);              // State za pracenje procesa brisanja komentara

  // Dohvata podatke o korisniku kada se promeni userId
  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      const data = await getUserById(userId);
      setUser(data);
    };

    fetchUser();
  }, [userId]);

  // Izdvajamo odgovore (decu) za ovaj komentar
  const replies = comments.filter((c) => c.parentID === commentId);

  // Metoda za brisanje komentara i svih njegovih odgovora
  const handleDelete = async (commentId) => {
    setIsDeleting(true);
    try {
      const result = await deleteComment({ commentId });
      if (result.data.success) {
        showSuccessToast("Comment and all replies have been deleted.");
      }
    } catch (err) {
      console.error("Error while deleting:", err);
      showErrorToast("Error while deleting the comment.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    // Animacija prikaza komentara prilikom mountovanja
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="comment-item p-4 bg-white rounded-md shadow-sm mb-4"
      style={{ marginLeft: `${Math.min(depth, 4) * 16}px` }}
    >
      <div className="flex items-start gap-3">
        {/* Profilna slika korisnika */}
        <img
          src={user?.profilePicture || DEFAULT_PROFILE_PICTURE}
          alt={`Profile picture of ${user?.name}`}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          {/* Ime korisnika */}
          <span className="font-semibold text-sm text-gray-800 block">
            {user && user.name}
          </span>

          {/* Tekst komentara */}
          <p className="text-sm text-gray-700 mt-1">{content}</p>

          {/* Vreme postavljanja komentara koristeci 'relativeTime' */}
          <small className="text-xs text-gray-500">
            <span>{dayjs(timestamp?.toDate()).fromNow()}</span>
          </small>

          {/* Prikaz forme za odgovor ako korisnik klikne Reply */}
          {isReplaying && (
            <div className="mt-2">
              <CommentForm
                postId={postID}
                userId={auth.currentUser?.uid}
                parentId={commentId}
                onSubmitSuccess={() => setIsReplaying(false)}
                autoFocus={true}
              />
            </div>
          )}

          <div>
            {/* Dugme za odgovor */}
            {depth < 4 ? (
              <button
                onClick={() => setIsReplaying(!isReplaying)}
                className="text-sm text-blue-500 hover:underline mt-1"
              >
                Reply
              </button>
            ) : (
              <button
                disabled
                className="text-sm text-gray-400 cursor-not-allowed mt-1"
                title="Maximum depth reached"
              >
                Reply
              </button>
            )}

            {/* Komponenta za reakcije na komentar */}
            <CommentReaction
              commentId={commentId}
              currentUserId={auth.currentUser?.uid}
            />

            {/* Dugme za brisanje komentara (vidljivo samo autoru) */}
            {auth.currentUser?.uid === userId && (
              <>
                {!isDeleting ? (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="text-sm text-blue-500 hover:underline ml-3"
                  >
                    Delete
                  </button>
                ) : (
                  <span className="text-sm text-gray-500 ml-3">
                    Deleting...
                  </span>
                )}

                {/* Confirm modal za potvrdu brisanja */}
                <ConfirmModal
                  isOpen={showConfirmModal}
                  title="Delete Comment"
                  message="Are you sure you want to delete this comment?"
                  onCancel={() => setShowConfirmModal(false)}
                  onConfirm={() => {
                    handleDelete(commentId);
                    setShowConfirmModal(false);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Prikaz odgovora (dece) rekurzivno */}
      {replies.length > 0 && (
        <div className="pl-6 mt-2 border-l border-gray-200 ml-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              commentId={reply.id}
              postID={reply.postID}
              userId={reply.userID}
              content={reply.content}
              timestamp={reply.timestamp}
              comments={comments}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

CommentItem.propTypes = {
  userId: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  timestamp: PropTypes.object,
  postID: PropTypes.string.isRequired,
  commentId: PropTypes.string.isRequired,
  comments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      userID: PropTypes.string.isRequired,
      content: PropTypes.string.isRequired,
      timestamp: PropTypes.object,
      postID: PropTypes.string.isRequired,
      parentID: PropTypes.string,
    })
  ).isRequired,
  depth: PropTypes.number,
};

export default CommentItem;
