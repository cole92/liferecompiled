import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { motion } from "framer-motion";

import { auth, db } from "../../firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
//import { deleteComment } from "../../firebase/functions"; 'Kanije cemo koristiti za Hard delete'
import { softDeleteComment } from "./commentsService";
import { getUserById } from "../../services/userService";
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";
import { showSuccessToast, showErrorToast } from "../../utils/toastUtils";

import CommentForm from "./CommentForm";
import CommentReaction from "./CommentReaction";
import ConfirmModal from "../modals/ConfirmModal";
import BadgeModal from "../modals/BadgeModal";
import ShieldIcon from "../ui/ShieldIcon";

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
 * @param {firebase.firestore.Timestamp} [editedAt] - Vreme poslednje izmene komentara (ako postoji).
 */

dayjs.extend(relativeTime);

const CommentItem = ({
  userId,
  content,
  timestamp,
  editedAt,
  postID,
  commentId,
  comments,
  depth = 0,
  showAll,
  deleted,
  locked = false,
}) => {
  const [user, setUser] = useState(null); // State za podatke korisnika
  const [isReplaying, setIsReplaying] = useState(false); // State za kontrolu prikaza forme za odgovor
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State za prikaz modala za potvrdu brisanja
  const [isDeleting, setIsDeleting] = useState(false); // State za pracenje procesa brisanja komentara
  const [isEditing, setIsEditing] = useState(false); // State za pracenje izmene postojeceg komentara
  const [editedContent, setEditedContent] = useState(content); // State za pracenje izmene teksta komentara
  const [showEditHint, setShowEditHint] = useState(false);
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);

  const hintShownRef = useRef(false);

  // Status da li je komentar obrisan (soft delete)
  const isDeleted = deleted;

  // Korisnik moze editovati komentar u roku od 10 minuta nakon postavljanja
  const canEdit =
    timestamp && Date.now() - timestamp.toDate().getTime() <= 10 * 60 * 1000;

  // Dohvata podatke o korisniku kada se promeni userId
  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      const data = await getUserById(userId);
      setUser(data);
    };

    fetchUser();
  }, [userId]);

  // Prikazuje hint za editovanje komentara samo ako korisnik ima pravo i nije video vise od 3 puta
  useEffect(() => {
    if (!auth.currentUser?.uid || auth.currentUser.uid !== userId || !canEdit)
      return;

    if (hintShownRef.current) return;
    hintShownRef.current = true;

    const storageKey = `editedHintCount_${auth.currentUser.uid}`;
    const count = parseInt(localStorage.getItem(storageKey) || "0", 10);

    if (count >= 3) return;

    setShowEditHint(true);
    localStorage.setItem(storageKey, (count + 1).toString());

    const timerId = setTimeout(() => setShowEditHint(false), 10_000);

    return () => clearTimeout(timerId);
  }, [userId, canEdit]);

  // Izdvajamo odgovore (decu) za ovaj komentar
  const replies = comments.filter((c) => c.parentID === commentId);

  // Metoda za brisanje komentara i svih njegovih odgovora
  const handleDelete = async (commentId) => {
    setIsDeleting(true);
    try {
      const result = await softDeleteComment({ commentId });
      if (result.data.success) {
        showSuccessToast("Comment removed.");
      }
    } catch (err) {
      console.error("Error while deleting:", err);
      showErrorToast("Error while deleting the comment.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Metoda za cuvanje izmenjenog komentara
  const handleSave = async () => {
    // Validacija: prazno ili identicno postojecom tekstu
    if (!editedContent.trim()) {
      showErrorToast("Comment cannot be empty!");
      return;
    } else if (editedContent.trim() === content.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      const commentRef = doc(db, "comments", commentId);
      await updateDoc(commentRef, {
        content: editedContent,
        editedAt: serverTimestamp(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update comment:", error);
      showErrorToast("Failed to update comment. Please try again.");
    }
  };

  // Metoda za odustajanje od izmene komentara
  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(content);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="comment-item p-4 bg-white rounded-md shadow-sm mb-4 break-words"
        style={{ marginLeft: `${Math.min(depth, 4) * 16}px` }}
      >
        <div className="flex items-start gap-3">
          {/* Avatar korisnika + bedz ako je Top Contributor */}
          <div className="relative shrink-0">
            <img
              src={user?.profilePicture || DEFAULT_PROFILE_PICTURE}
              alt={`Profile picture of ${user?.name}`}
              className={`w-10 h-10 rounded-full object-cover ${
                user?.badges?.topContributor ? "ring-2 ring-purple-800" : ""
              }`}
            />

            {user?.badges?.topContributor && (
              <div
                title="Top Contributor · Code-powered"
                className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTopContributorModal(true);
                }}
              >
                <ShieldIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
            )}
          </div>

          {/* Tekstualni deo komentara */}
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-gray-800">
              {user?.name}
            </span>

            {/* Sadržaj komentara / edit mode / obrisan */}
            {isEditing ? (
              <div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-2 border rounded mt-2"
                />
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={handleSave}
                    className="text-green-500 hover:underline"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="text-gray-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : isDeleted ? (
              <p className="italic text-gray-500 mt-1">
                This comment has been removed.
              </p>
            ) : (
              <p className="text-sm text-gray-700 mt-1 break-words whitespace-pre-wrap">
                {!showAll && content.length > 150
                  ? content.slice(0, 150) + "…"
                  : content}
              </p>
            )}

            {/* Vremenska oznaka (Posted / Edited) */}
            <small className="block text-xs text-gray-500 mt-1">
              {editedAt
                ? `Edited ${dayjs(editedAt.toDate()).fromNow()}`
                : `Posted ${dayjs(timestamp.toDate()).fromNow()}`}
            </small>

            {/* Reply forma (ako je aktivirana) */}
            {isReplaying && (
              <div className="mt-2">
                <CommentForm
                  postId={postID}
                  userId={auth.currentUser?.uid}
                  parentId={commentId}
                  onSubmitSuccess={() => setIsReplaying(false)}
                  autoFocus
                />
              </div>
            )}

            {/* Kontrole (Reply, Report, Reakcije, Edit, Delete) */}
            {showAll && !isDeleted && (
              <>
                {/* Reply dugme (do max dubine) */}
                {!locked &&
                  (depth < 4 ? (
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
                  ))}

                {/* Report placeholder */}
                {!locked && (
                  <button
                    onClick={() => {}}
                    className="text-sm text-red-500 hover:underline ml-3"
                  >
                    Report
                  </button>
                )}

                {/* Reakcije na komentar */}
                <CommentReaction
                  commentId={commentId}
                  currentUserId={auth.currentUser?.uid}
                  locked={locked}
                />

                {/* Edit i Delete — samo autor */}
                {!isDeleted && auth.currentUser?.uid === userId && !locked && (
                  <>
                    {!isEditing && (
                      <div className="relative inline-block">
                        {showEditHint && (
                          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 shadow-md z-10">
                            You can edit this comment for 10 minutes
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45" />
                          </div>
                        )}

                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-sm text-blue-500 hover:underline ml-3"
                        >
                          Edit
                        </button>
                      </div>
                    )}

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
              </>
            )}
          </div>
        </div>

        {/* Rekurzivni prikaz odgovora */}
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
                editedAt={reply.editedAt}
                deleted={reply.deleted}
                depth={depth + 1}
                showAll={showAll}
                locked={locked}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Modal za prikaz Top Contributor badge-a */}
      {showTopContributorModal && (
        <BadgeModal
          isOpen={showTopContributorModal}
          authorBadge="topContributor"
          onClose={() => setShowTopContributorModal(false)}
        />
      )}
    </>
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
  showAll: PropTypes.bool,
  editedAt: PropTypes.object,
  deleted: PropTypes.bool,
  locked: PropTypes.bool,
};

export default CommentItem;
