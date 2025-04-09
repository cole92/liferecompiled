import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { auth } from "../../firebase";
import { getUserById } from "../../services/userService";
import { deleteComment } from "../../firebase/functions";
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";
import CommentForm from "./CommentForm";
import ConfirmModal from "../../utils/ConfirmModal";

/**
 * Komponenta za prikaz jednog komentara sa korisnickim informacijama.
 * Prikazuje i odgovore (replies) na komentar ako postoje.
 *
 * Dohvata korisnicke podatke (ime i sliku) iz Firestore-a pomocu `getUserById`.
 *
 * @param {string} userId - ID korisnika koji je ostavio komentar
 * @param {string} content - Tekst komentara
 * @param {firebase.firestore.Timestamp} timestamp - Firestore timestamp objekat
 * @param {string} postID - ID posta na koji komentar pripada
 * @param {string} commentId - ID ovog komentara
 * @param {Array<Object>} comments - Svi komentari vezani za post (za pronalazenje odgovora)
 */

dayjs.extend(relativeTime);

const CommentItem = ({
  userId,
  content,
  timestamp,
  postID,
  commentId,
  comments,
}) => {
  const [user, setUser] = useState(null); // State za podatke korisnika
  const [isReplaying, setIsReplaying] = useState(false); // Na osnovu ovog state-a znamo da li je odgovor na komentar
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    // Ako nemamo userId, ne pokrecemo dohvat
    if (!userId) return;
    // Asinhrona funkcija za dohvat podataka korisnika
    const fetchUser = async () => {
      const data = await getUserById(userId); // Koristimo helper funkciju
      setUser(data); // Azuriramo state sa podacima korisnika
    };

    fetchUser(); // Poziv funkcije prilikom mountovanja komponente
  }, [userId]); // useEffect se pokrece kad se userId promeni

  const replies = comments.filter((c) => c.parentID === commentId);

  // Metoda za brisanje komentara
  const handleDelete = async (commentId) => {
    try {
      const result = await deleteComment({ commentId });
      if (result.data.success) {
        showSuccessToast("Komentar i svi odgovori su obrisani.");
      }
    } catch (err) {
      console.error("Greska pri brisanju:", err);
      showErrorToast("Greska pri brisanju komentara.");
    }
  };

  return (
    <div className="comment-item p-4 bg-white rounded-md shadow-sm mb-4">
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

          {/* Vreme postavljanja komentara koristeci 'relativeTime plugin' */}
          <small className="text-xs text-gray-500">
            <span>{dayjs(timestamp?.toDate()).fromNow()}</span>
          </small>
          {isReplaying && (
            <div className="mt-2">
              <CommentForm
                postId={postID}
                userId={auth.currentUser?.uid}
                parentId={commentId}
              />
            </div>
          )}
          <div>
            {/* Dugme za prikaz forme za odgovor */}
            <button
              onClick={() => setIsReplaying(!isReplaying)}
              className="text-sm text-blue-500 hover:underline mt-1"
            >
              Reply
            </button>
            {/* Uslovno prikazivanje dugmeta za brisanje komentara*/}
            {auth.currentUser?.uid === userId && (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="text-sm text-blue-500 hover:underline mt-1"
              >
                Delete
              </button>
            )}
            {/* Modal komponenta */}

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
          </div>
        </div>
      </div>
      {/* Odgovori (deca) */}
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
            />
          ))}
        </div>
      )}
    </div>
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
};

export default CommentItem;
