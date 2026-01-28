import { useEffect, useState, useRef, useContext } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { motion } from "framer-motion";
import { FiMoreHorizontal } from "react-icons/fi";

import { auth, db } from "../../firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
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
  maxDepthForReply = 4,
  maxDepthForRender = Infinity,
}) => {
  const [user, setUser] = useState(null);
  const [isReplying, setIsReplying] = useState(false);
  const [isRepliesOpen, setIsRepliesOpen] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showEditHint, setShowEditHint] = useState(false);

  const [showTopContributorModal, setShowTopContributorModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const { user: currentUserCtx } = useContext(AuthContext);
  const currentUser = currentUserCtx || auth.currentUser;

  const currentUserId = currentUser?.uid ?? null;
  const isAuthor = !!currentUserId && currentUserId === userId;
  const isAdmin = currentUserCtx?.isAdmin === true;
  const canManageComment = isAuthor || isAdmin;

  const hintShownRef = useRef(false);

  const tsDate = timestamp?.toDate?.();
  const editedDate = editedAt?.toDate?.();
  const editId = `comment-edit-${commentId}`;

  const canEdit = !!tsDate && Date.now() - tsDate.getTime() <= 10 * 60 * 1000;

  const disableReplyButton = locked || depth >= maxDepthForReply;
  const blockRenderingChildren = depth >= maxDepthForRender;
  const isDeleted = deleted;

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
    } finally {
      setShowReportModal(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    (async () => {
      try {
        const data = await getUserById(userId);
        if (isMounted) setUser(data);
      } catch (e) {
        console.error("Failed to fetch user:", e);
      }
    })();

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

  const rawReplies = childrenMap?.[commentId] || [];
  const sortedReplies = [...rawReplies].sort((a, b) => {
    const aT =
      a.timestamp?.toMillis?.() || a.timestamp?.toDate?.()?.getTime?.() || 0;
    const bT =
      b.timestamp?.toMillis?.() || b.timestamp?.toDate?.()?.getTime?.() || 0;
    return aT - bT; // oldest first inside thread
  });

  // show deleted reply only if it has at least one non-deleted child
  const visibleReplies = sortedReplies.filter((r) => {
    if (!r.deleted) return true;
    const kids = childrenMap?.[r.id] || [];
    return kids.some((k) => !k.deleted);
  });

  const directReplies = visibleReplies.length;

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      const result = await softDeleteComment({ commentId: id });
      if (result?.data?.success) showSuccessToast("Comment removed.");
      else showErrorToast("Error while deleting the comment.");
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="py-4"
      >
        {/* MAIN COMMENT ROW */}
        <div className="rounded-xl px-2 sm:px-3 py-3 hover:bg-zinc-950/20 transition">
          <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 items-start">
            <div className="relative">
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

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-sm text-zinc-100">
                  {user?.name || "Unknown Author"}
                </span>

                <span className="text-xs text-zinc-500">
                  {editedDate
                    ? `• edited ${dayjs(editedDate).fromNow()}`
                    : tsDate
                      ? `• ${dayjs(tsDate).fromNow()}`
                      : "• just now"}
                </span>
              </div>

              {showEditHint && (
                <div className="mt-1 text-xs text-sky-300">
                  Tip: you can edit your comment within the first 10 minutes.
                </div>
              )}

              {isEditing ? (
                <div className="mt-2">
                  <textarea
                    id={editId}
                    name="editedComment"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 p-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
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
                <p className="italic text-zinc-400 mt-2">
                  This comment has been removed.
                </p>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-zinc-100">
                  {!showAll && seeAllTruncation(content)
                    ? content.slice(0, 150) + "…"
                    : content}
                </p>
              )}

              {/* ACTIONS */}
              {showAll && !isDeleted && (
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
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

                  <CommentReaction
                    commentId={commentId}
                    currentUserId={auth.currentUser?.uid}
                    locked={locked}
                  />

                  <details className="relative">
                    <summary
                      className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 [&::-webkit-details-marker]:hidden"
                      aria-label="More actions"
                    >
                      <FiMoreHorizontal />
                      <span className="sr-only">More</span>
                    </summary>

                    <div className="absolute right-0 mt-2 w-44 rounded-xl border border-zinc-800 bg-zinc-950/95 p-1 shadow-lg z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.ensureStop?.();
                          e.stopPropagation();
                          e.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          onReportClick();
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 rounded-lg"
                      >
                        Report
                      </button>

                      {isAuthor && !locked && !isEditing && canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.currentTarget
                              .closest("details")
                              ?.removeAttribute("open");
                            setIsEditing(true);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/50 rounded-lg"
                        >
                          Edit
                        </button>
                      )}

                      {canManageComment && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.currentTarget
                              .closest("details")
                              ?.removeAttribute("open");
                            setShowConfirmModal(true);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/10 rounded-lg"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* REPLY FORM */}
              {isReplying && !locked && (
                <CommentForm
                  postId={postID}
                  parentId={commentId}
                  onSubmitSuccess={() => setIsReplying(false)}
                  autoFocus
                  wrapperClassName="mt-3"
                />
              )}

              {/* REPLIES TOGGLE */}
              {showAll && !blockRenderingChildren && directReplies > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setIsRepliesOpen((v) => !v)}
                    className="text-xs text-sky-300 hover:text-sky-200 hover:underline"
                    aria-label={isRepliesOpen ? "Hide replies" : "View replies"}
                  >
                    {isRepliesOpen
                      ? "Hide replies"
                      : `View replies (${directReplies})`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* REPLIES LIST (NO INDENT) */}
        {showAll &&
          !blockRenderingChildren &&
          isRepliesOpen &&
          directReplies > 0 && (
            <div className="mt-3 space-y-2">
              {visibleReplies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  commentId={reply.id}
                  postID={reply.postID}
                  userId={reply.userID}
                  content={reply.content}
                  timestamp={reply.timestamp}
                  editedAt={reply.editedAt}
                  comments={comments}
                  childrenMap={childrenMap}
                  depth={depth + 1}
                  showAll={showAll}
                  deleted={reply.deleted}
                  locked={locked}
                  disableBadgeModal={disableBadgeModal}
                  maxDepthForReply={maxDepthForReply}
                  maxDepthForRender={maxDepthForRender}
                />
              ))}
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
        confirmText="Yes"
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

// helper to keep original behavior without duplicating logic in JSX
function seeAllTruncation(text) {
  return typeof text === "string" && text.length > 150;
}

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
    }),
  ).isRequired,
  childrenMap: PropTypes.object,
  depth: PropTypes.number,
  showAll: PropTypes.bool,
  deleted: PropTypes.bool,
  locked: PropTypes.bool,
  disableBadgeModal: PropTypes.bool,
  maxDepthForReply: PropTypes.number,
  maxDepthForRender: PropTypes.number,
};

export default CommentItem;
