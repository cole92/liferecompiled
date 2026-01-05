import { useEffect, useState, useRef, useContext } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { motion } from "framer-motion";

import { auth, db } from "../../firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
// import { deleteComment } from "../../firebase/functions"; // Rezervisano za hard delete
import { softDeleteComment } from "./commentsService";
import { getUserById } from "../../services/userService";
import { submitReport } from "../../services/reportService";
import { AuthContext } from "../../context/AuthContext";
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
import Avatar from "../common/Avatar";

/**
 * @component CommentItem
 * Rekurzivna komponenta za prikaz jednog komentara sa korisnickim informacijama i podrskom za preview odgovora.
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
  const [expanded, setExpanded] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { user: currentUserCtx } = useContext(AuthContext);
  const currentUser = currentUserCtx || auth.currentUser;

  const currentUserId = currentUser?.uid ?? null;
  const isAuthor = !!currentUserId && currentUserId === userId;
  const isAdmin = currentUserCtx?.isAdmin === true;
  const canManageComment = isAuthor || isAdmin;

  const isRoot = depth === 0;
  const hintShownRef = useRef(false);

  const isDeleted = deleted;
  const tsDate = timestamp?.toDate?.();
  const editedDate = editedAt?.toDate?.();
  const editId = `comment-edit-${commentId}`;

  const canEdit = !!tsDate && Date.now() - tsDate.getTime() <= 10 * 60 * 1000;

  const onReportClick = () => {
    if (!currentUser) {
      showInfoToast("Please login to report 😊");
      return;
    }
    setShowReportModal(true);
  };

  const onCancelReport = () => setShowReportModal(false);

  const onConfirmReport = async () => {
    if (!currentUser) {
      showInfoToast("Please login to report 😊");
      setShowReportModal(false);
      return;
    }

    if (currentUser?.uid === userId) {
      showInfoToast("You can't report your own comment.");
      return;
    }

    try {
      await submitReport({
        type: "comment",
        targetId: commentId,
        reportedBy: currentUser.uid,
      });
      showSuccessToast("Comment reported. Thank you!");
    } catch (error) {
      showErrorToast("Report failed. Try again.");
      console.log(error);
    } finally {
      setShowReportModal(false);
    }
  };

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

  const rawReplies = childrenMap
    ? childrenMap[commentId] || []
    : comments.filter((c) => c.parentID === commentId);

  const sortedReplies = [...rawReplies].sort((a, b) => {
    const aT =
      a.timestamp?.toMillis?.() || a.timestamp?.toDate?.()?.getTime?.() || 0;
    const bT =
      b.timestamp?.toMillis?.() || b.timestamp?.toDate?.()?.getTime?.() || 0;
    return aT - bT;
  });

  const directReplies = sortedReplies.length;
  const previewN =
    typeof repliesPreviewCount === "number"
      ? Math.max(0, repliesPreviewCount)
      : directReplies === 1
      ? 1
      : isRoot
      ? 1
      : 0;

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
    ? "ring-1 ring-sky-400/20 bg-sky-500/5"
    : "";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`group comment-item rounded-lg py-4 px-2 border-b border-zinc-800/80 last:border-none hover:bg-zinc-950/20 ${containerHighlight}`}
      >
        <div className="flex items-start gap-3">
          {/* Avatar autora + opcioni Top Contributor badge */}
          <div className="relative shrink-0">
            <Avatar
              src={user?.profilePicture ?? DEFAULT_PROFILE_PICTURE}
              size={32}
              zoomable
              badge={user?.badges?.topContributor ?? false}
              alt={`Profile picture of ${user?.name ?? "user"}`}
            />
            {user?.badges?.topContributor && (
              <div
                title="Top Contributor · Code-powered"
                role="button"
                tabIndex={0}
                aria-label="Show Top Contributor badge info"
                className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  if (disableBadgeModal) return;
                  setShowTopContributorModal(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (disableBadgeModal) return;
                    setShowTopContributorModal(true);
                  }
                }}
              >
                <ShieldIcon className="w-5 h-5 text-sky-200 group-hover:scale-110 transition-transform" />
              </div>
            )}
          </div>

          {/* Glavna kolona komentara */}
          <div className="min-w-0 flex-1">
            {/* Ime autora + meta podaci o vremenu */}
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold text-sm text-zinc-100">
                {user?.name || "Unknown Author"}
              </span>
              <span className="text-xs text-zinc-400">
                {editedDate
                  ? `• edited ${dayjs(editedDate).fromNow()}`
                  : tsDate
                  ? `• ${dayjs(tsDate).fromNow()}`
                  : "• just now"}
              </span>
            </div>

            {/* Hint za edit (ako je aktivan) */}
            {showEditHint && (
              <div className="mt-1 text-xs text-sky-300">
                Tip: you can edit your comment within the first 10 minutes.
              </div>
            )}

            {/* Sadrzaj, edit forma ili obrisan status */}
            {isEditing ? (
              <div>
                <textarea
                  id={editId}
                  name="editedComment"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950/40 p-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  aria-label="Edit comment"
                />
                <div className="flex gap-3 mt-2 text-sm">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="text-emerald-300 hover:text-emerald-200 hover:underline"
                    aria-label="Save edited comment"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-zinc-400 hover:text-zinc-200 hover:underline"
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : isDeleted ? (
              <p className="italic text-zinc-400 mt-1">
                This comment has been removed.
              </p>
            ) : (
              <p className="mt-1 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-zinc-100">
                {!showAll && content.length > 150
                  ? content.slice(0, 150) + "…"
                  : content}
              </p>
            )}

            {/* Akcije ispod komentara */}
            {showAll && !isDeleted && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                {/* Reply dugme */}
                <button
                  type="button"
                  onClick={() => setIsReplying((v) => !v)}
                  className={
                    disableReplyButton
                      ? "cursor-not-allowed opacity-50 text-zinc-500"
                      : "text-sky-300 hover:text-sky-200 hover:underline"
                  }
                  disabled={disableReplyButton}
                  aria-label={
                    disableReplyButton ? "Reply disabled" : "Reply to comment"
                  }
                >
                  Reply
                </button>

                {/* Report dugme */}
                <button
                  type="button"
                  onClick={onReportClick}
                  className="text-zinc-400 hover:text-zinc-200 hover:underline"
                  aria-label="Report comment"
                >
                  Report
                </button>

                <div className="h-4 w-px bg-zinc-800" />

                {/* Reakcije na komentar */}
                <CommentReaction
                  commentId={commentId}
                  currentUserId={auth.currentUser?.uid}
                  locked={locked}
                />

                {/* Edit */}
                {isAuthor && !locked && !isEditing && canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit) {
                        showInfoToast(
                          "You can edit only within 10 minutes after posting"
                        );
                        return;
                      }
                      setIsEditing(true);
                    }}
                    className="text-zinc-400 hover:text-zinc-200 hover:underline"
                    aria-label="Edit comment"
                  >
                    Edit
                  </button>
                )}

                {/* Delete */}
                {canManageComment && (
                  <>
                    {!isDeleting ? (
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        className="text-zinc-400 hover:text-zinc-200 hover:underline"
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

            {/* Forma za reply */}
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

        {/* Rekurzivni prikaz odgovora */}
        {showAll && !blockRenderingChildren && sortedReplies.length > 0 && (
          <div className="mt-2 ml-5">
            <div
              className={`relative pl-5 border-l ${
                isActiveThreadRoot ? "border-sky-400/20" : "border-zinc-800"
              }`}
            >
              {sortedReplies
                .slice(0, expanded ? Number.POSITIVE_INFINITY : previewN)
                .map((reply) => (
                  <div key={reply.id} className="relative">
                    <span className="absolute -left-[5px] top-5 w-2 h-2 bg-zinc-700 rounded-full" />
                    <span className="absolute -left-5 top-5 w-5 border-t border-zinc-800" />
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
                    setActiveThreadId &&
                      setActiveThreadId(!expanded ? commentId : null);
                  }}
                  className="my-1 text-xs text-sky-300 hover:text-sky-200 hover:underline"
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

      <ConfirmModal
        isOpen={showReportModal}
        title="Are you sure you want to report this comment?"
        message="This will notify moderators about this comment."
        confirmText={"Yes"}
        onCancel={onCancelReport}
        onConfirm={onConfirmReport}
      />

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
  activeThreadId: PropTypes.string,
  setActiveThreadId: PropTypes.func,
};

export default CommentItem;
