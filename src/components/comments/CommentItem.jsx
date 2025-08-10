import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { motion } from "framer-motion";

import { auth, db } from "../../firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
// import { deleteComment } from "../../firebase/functions"; // Kasnije za hard delete
import { softDeleteComment } from "./commentsService";
import { getUserById } from "../../services/userService";
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
} from "../../utils/toastUtils";

import CommentForm from "./CommentForm";
import CommentReaction from "./CommentReaction";
import ConfirmModal from "../modals/ConfirmModal";
import BadgeModal from "../modals/BadgeModal";
import ShieldIcon from "../ui/ShieldIcon";

/**
 * Komponenta za prikaz jednog komentara sa korisnickim informacijama.
 *
 * - Prikazuje osnovne podatke o autoru i komentaru
 * - Prikazuje reakcije, omogucava izmenu i brisanje komentara (ako je korisnik autor)
 * - Omogucava odgovaranje na komentar do maksimalne dubine
 * - Soft delete podrzan kroz confirm modal
 * - Prikazuje badge ako je autor "Top Contributor"
 * - Prikazuje informaciju o editovanosti i vreme objave
 * - Omogucava prikaz forme za reply, kao i rekurzivni prikaz odgovora
 * - Komentar moze biti editovan do 10 minuta nakon objave
 *
 * @component
 * @param {string} userId - ID korisnika koji je ostavio komentar
 * @param {string} content - Tekst komentara
 * @param {object} timestamp - Firestore timestamp objekat
 * @param {object} editedAt - Firestore timestamp izmene (opciono)
 * @param {string} postID - ID posta na koji komentar pripada
 * @param {string} commentId - ID ovog komentara
 * @param {Array<Object>} comments - Lista svih komentara za dati post (fallback kada nema childrenMap)
 * @param {Object<string,Array<Object>>} [childrenMap] - Opciona mapa: parentID -> niz direktne dece (performanse)
 * @param {number} [depth=0] - Trenutna dubina komentara (root = 0)
 * @param {boolean} [showAll=false] - Da li prikazati sve funkcionalnosti (reply, delete, edit itd.)
 * @param {boolean} [deleted=false] - Da li je komentar obrisan (soft delete)
 * @param {boolean} [locked=false] - Da li je komentar zakljucan (iskljucuje interakcije)
 * @param {boolean} [disableBadgeModal=false] - Da li onemoguciti prikaz modala sa badge info
 * @param {number} [repliesPreviewCount] - (Opc.) Koliko direktnih odgovora prikazati u preview-u
 * @param {number} [maxDepthForReply=4] - Max dubina na kojoj je dozvoljen "Reply"
 * @param {number} [maxDepthForRender=Infinity] - Max dubina renderovanja rekurzije
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
  childrenMap,
  depth = 0,
  showAll = false,
  deleted = false,
  locked = false,
  disableBadgeModal = false,
  repliesPreviewCount,
  maxDepthForReply = 4,
  maxDepthForRender = Infinity,
  activeThreadId,
  setActiveThreadId,
}) => {
  const [user, setUser] = useState(null);
  const [isReplying, setIsReplying] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showEditHint, setShowEditHint] = useState(false);
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);

  // Lokalni toggle za otvaranje grane
  const [expanded, setExpanded] = useState(false);

  const isRoot = depth === 0;
  const hintShownRef = useRef(false);

  const isDeleted = deleted;

  const tsDate = timestamp?.toDate?.();
  const editedDate = editedAt?.toDate?.();

  const canEdit = !!tsDate && Date.now() - tsDate.getTime() <= 10 * 60 * 1000;

  // user fetch
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const data = await getUserById(userId);
        if (isMounted) setUser(data);
      } catch (e) {
        console.error("Failed to fetch user:", e);
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // edit hint
  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || currentUid !== userId || !canEdit) return;
    if (hintShownRef.current) return;
    hintShownRef.current = true;

    const storageKey = `editedHintCount_${currentUid}`;
    const count = parseInt(localStorage.getItem(storageKey) || "0", 10);
    if (count >= 3) return;

    setShowEditHint(true);
    localStorage.setItem(storageKey, (count + 1).toString());
    const timerId = setTimeout(() => setShowEditHint(false), 10_000);
    return () => clearTimeout(timerId);
  }, [userId, canEdit]);

  // ---- REPLIES (direktna deca ovog komentara) ----
  const rawReplies = childrenMap
    ? childrenMap[commentId] || []
    : comments.filter((c) => c.parentID === commentId);

  // sortiramo starije -> novije radi toka razgovora
  const sortedReplies = [...rawReplies].sort((a, b) => {
    const aT =
      a.timestamp?.toMillis?.() || a.timestamp?.toDate?.()?.getTime?.() || 0;
    const bT =
      b.timestamp?.toMillis?.() || b.timestamp?.toDate?.()?.getTime?.() || 0;
    return aT - bT;
  });

  // Koliko prikazujemo odmah (previewN):
  // - ako je prosledjen repliesPreviewCount, koristi njega
  // - inace: ako tacno 1 direktan odgovor -> 1; u suprotnom root=1, dublje=0
  const directReplies = sortedReplies.length;
  const previewN =
    typeof repliesPreviewCount === "number"
      ? Math.max(0, repliesPreviewCount)
      : directReplies === 1
      ? 1
      : isRoot
      ? 1
      : 0;

  // ---- HANDLERS ----
  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      const result = await softDeleteComment({ commentId: id });
      if (result?.data?.success) {
        showSuccessToast("Comment removed.");
      } else {
        showErrorToast("Error while deleting the comment.");
      }
    } catch (err) {
      console.error("Error while deleting:", err);
      showErrorToast("Error while deleting the comment.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    const trimmed = editedContent.trim();
    if (!trimmed) {
      showErrorToast("Comment cannot be empty!");
      return;
    }
    if (trimmed === content.trim()) {
      setIsEditing(false);
      return;
    }
    try {
      const commentRef = doc(db, "comments", commentId);
      await updateDoc(commentRef, {
        content: trimmed,
        editedAt: serverTimestamp(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update comment:", error);
      showErrorToast("Failed to update comment. Please try again.");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(content);
  };

  const disableReplyButton = locked || depth >= maxDepthForReply;
  const blockRenderingChildren = depth >= maxDepthForRender;

  const isActiveThreadRoot = activeThreadId === commentId;
  const containerHighlight = isActiveThreadRoot
    ? "ring-1 ring-blue-300 bg-blue-50/40 rounded-lg"
    : "";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`group comment-item py-4 px-2 border-b last:border-none hover:bg-gray-50 ${containerHighlight}`}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <img
              src={user?.profilePicture || DEFAULT_PROFILE_PICTURE}
              alt={`Profile picture of ${user?.name || "user"}`}
              className={`w-8 h-8 rounded-full object-cover ${
                user?.badges?.topContributor ? "ring-2 ring-purple-800" : ""
              }`}
            />
            {user?.badges?.topContributor && (
              <div
                title="Top Contributor · Code-powered"
                className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  if (disableBadgeModal) return;
                  setShowTopContributorModal(true);
                }}
                role="button"
                aria-label="Show Top Contributor badge info"
              >
                <ShieldIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
            )}
          </div>

          {/* Desna kolona */}
          <div className="min-w-0 flex-1">
            {/* Ime + meta */}
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold text-sm text-gray-800">
                {user?.name || "Unknown user"}
              </span>
              <span className="text-xs text-gray-500">
                {editedDate
                  ? `• edited ${dayjs(editedDate).fromNow()}`
                  : tsDate
                  ? `• ${dayjs(tsDate).fromNow()}`
                  : "• just now"}
              </span>
            </div>

            {/* Edit hint (opciono) */}
            {showEditHint && (
              <div className="mt-1 text-xs text-blue-600">
                Tip: mozes izmeniti komentar u prvih 10 minuta.
              </div>
            )}

            {/* Sadrzaj / edit / obrisan */}
            {isEditing ? (
              <div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-2 border rounded mt-2"
                  aria-label="Edit comment"
                />
                <div className="flex gap-3 mt-2 text-sm">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="text-green-600 hover:underline"
                    aria-label="Save edited comment"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-gray-500 hover:underline"
                    aria-label="Cancel editing"
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
              <p className="text-[0.95rem] leading-relaxed text-gray-800 mt-1 whitespace-pre-wrap">
                {!showAll && content.length > 150
                  ? content.slice(0, 150) + "…"
                  : content}
              </p>
            )}

            {/* Akcije */}
            {showAll && !isDeleted && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                {/* Reply */}
                <button
                  type="button"
                  onClick={() => setIsReplying((v) => !v)}
                  className={`hover:underline ${
                    disableReplyButton
                      ? "cursor-not-allowed opacity-50"
                      : "text-blue-600"
                  }`}
                  disabled={disableReplyButton}
                  aria-label={
                    disableReplyButton ? "Reply disabled" : "Reply to comment"
                  }
                >
                  Reply
                </button>

                {/* Report */}
                {!locked && (
                  <button
                    type="button"
                    onClick={() => showInfoToast("Report is coming soon")}
                    className="hover:underline"
                    aria-label="Report comment"
                  >
                    Report
                  </button>
                )}

                <div className="h-4 w-px bg-gray-300" />

                {/* Reactions */}
                <div className="inline-flex items-center">
                  <CommentReaction
                    commentId={commentId}
                    currentUserId={auth.currentUser?.uid}
                    locked={locked}
                  />
                </div>

                {/* Author-only actions */}
                {auth.currentUser?.uid === userId && !locked && (
                  <>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="hover:underline"
                        aria-label="Edit comment"
                      >
                        Edit
                      </button>
                    )}

                    {!isDeleting ? (
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        className="hover:underline"
                        aria-label="Delete comment"
                      >
                        Delete
                      </button>
                    ) : (
                      <span aria-live="polite">Deleting…</span>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Reply forma */}
            {isReplying && !locked && (
              <div className="mt-2">
                <CommentForm
                  postId={postID}
                  userId={auth.currentUser?.uid}
                  parentId={commentId}
                  onSubmitSuccess={() => setIsReplying(false)}
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        {/* REPLIES: kontrola render dubine + preview + lokalni toggle */}
        {showAll && !blockRenderingChildren && sortedReplies.length > 0 && (
          <div className="mt-2 ml-5">
            <div
              className={`relative pl-5 border-l ${
                isActiveThreadRoot ? "border-blue-200" : "border-gray-200"
              }`}
            >
              {sortedReplies
                .slice(0, expanded ? Number.POSITIVE_INFINITY : previewN)
                .map((reply) => (
                  <div key={reply.id} className="relative">
                    {/* node tacka + elbow */}
                    <span className="absolute -left-[5px] top-5 w-2 h-2 bg-gray-300 rounded-full" />
                    <span className="absolute -left-5 top-5 w-5 border-t border-gray-200" />

                    <CommentItem
                      commentId={reply.id}
                      postID={reply.postID}
                      userId={reply.userID}
                      content={reply.content}
                      timestamp={reply.timestamp}
                      comments={comments}
                      childrenMap={childrenMap}
                      editedAt={reply.editedAt}
                      deleted={reply.deleted}
                      depth={depth + 1}
                      showAll={showAll}
                      locked={locked}
                      disableBadgeModal={disableBadgeModal}
                      repliesPreviewCount={repliesPreviewCount}
                      maxDepthForReply={maxDepthForReply}
                      maxDepthForRender={maxDepthForRender}
                      activeThreadId={activeThreadId}
                      setActiveThreadId={setActiveThreadId}
                    />
                  </div>
                ))}

              {sortedReplies.length > previewN && (
                <button
                  type="button"
                  onClick={() => {
                    setExpanded((v) => !v);
                    // kada otvaramo – postavi aktivni nit; kada zatvaramo – ugasi
                    setActiveThreadId &&
                      setActiveThreadId(!expanded ? commentId : null);
                  }}
                  className="my-1 text-xs text-blue-600 hover:underline"
                  aria-label={
                    expanded ? "Show less replies" : "Show more replies"
                  }
                >
                  {expanded
                    ? "Show less"
                    : `Show replies (${sortedReplies.length - previewN})`}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Confirm modal */}
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

      {/* Badge modal */}
      {showTopContributorModal && (
        <BadgeModal
          isOpen={showTopContributorModal}
          locked={locked}
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
  editedAt: PropTypes.object,
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
      editedAt: PropTypes.object,
      deleted: PropTypes.bool,
    })
  ).isRequired,
  childrenMap: PropTypes.object,
  depth: PropTypes.number,
  showAll: PropTypes.bool,
  deleted: PropTypes.bool,
  locked: PropTypes.bool,
  disableBadgeModal: PropTypes.bool,
  repliesPreviewCount: PropTypes.number,
  maxDepthForReply: PropTypes.number,
  maxDepthForRender: PropTypes.number,
  activeThreadId: PropTypes.string, // ili null
  setActiveThreadId: PropTypes.func,
};

export default CommentItem;
