// src/components/comments/CommentItem.jsx
import { useEffect, useMemo, useRef, useState, useContext } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { motion } from "framer-motion";
import {
  FiMoreHorizontal,
  FiChevronDown,
  FiChevronUp,
  FiCornerDownRight,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

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

const getPortalRoot = () =>
  document.getElementById("modal-root") || document.body;

const MENU_WIDTH = 176;
const MENU_MARGIN = 12;

// Toast IDs (anti-spam)
const REPORT_COMMENT_AUTH_TOAST_ID = "report:comment:auth";
const REPORT_COMMENT_SELF_TOAST_ID = "report:comment:self";
const REPORT_COMMENT_SUCCESS_TOAST_ID = "report:comment:success";
const REPORT_COMMENT_ERROR_TOAST_ID = "report:comment:error";

const COMMENT_DELETE_SUCCESS_TOAST_ID = "comment:delete:success";
const COMMENT_DELETE_ERROR_TOAST_ID = "comment:delete:error";

const COMMENT_EDIT_EMPTY_TOAST_ID = "comment:edit:empty";
const COMMENT_EDIT_ERROR_TOAST_ID = "comment:edit:error";

const getRepliesIndent = (depth) => {
  if (depth <= 0) return "pl-4 sm:pl-5";
  if (depth === 1) return "pl-3 sm:pl-4";
  return "pl-2 sm:pl-3";
};

const NAME_LINK_BASE =
  "font-semibold text-sm text-zinc-100 " +
  "hover:text-zinc-100 hover:underline underline-offset-4 decoration-zinc-500/70 " +
  "transition " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-md";

const CommentItem = ({
  userId,
  content,
  timestamp,
  editedAt,
  postID,
  commentId,
  childrenMap,
  depth = 0,
  showAll = false,
  deleted = false,
  locked = false,
  disableBadgeModal = false,
  maxDepthForReply = 4,
  maxDepthForRender = Infinity,
  parentAuthor = null, // { id, name } for "Replying to"
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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const menuBtnRef = useRef(null);
  const hintShownRef = useRef(false);

  const portalRoot = useMemo(() => {
    if (typeof document === "undefined") return null;
    return getPortalRoot();
  }, []);

  const { user: ctxUser } = useContext(AuthContext);
  const currentUser = ctxUser || auth.currentUser;

  const currentUserId = currentUser?.uid ?? null;
  const isAuthor = !!currentUserId && currentUserId === userId;
  const isAdmin = ctxUser?.isAdmin === true;
  const canManageComment = isAuthor || isAdmin;

  const tsDate = timestamp?.toDate?.();
  const editedDate = editedAt?.toDate?.();
  const editId = `comment-edit-${commentId}`;

  const canEdit = !!tsDate && Date.now() - tsDate.getTime() <= 10 * 60 * 1000;

  const isDeleted = deleted;
  const disableReplyButton = locked || isDeleted || depth >= maxDepthForReply;
  const blockRenderingChildren = depth >= maxDepthForRender;

  useEffect(() => {
    if (!isEditing) setEditedContent(content);
  }, [content, isEditing]);

  const onReportClick = () => {
    if (!currentUser) {
      showInfoToast("Please login to report 😊", {
        toastId: REPORT_COMMENT_AUTH_TOAST_ID,
      });
      return;
    }
    setShowReportModal(true);
  };

  const onCancelReport = () => setShowReportModal(false);

  const onConfirmReport = async () => {
    if (!currentUser) {
      showInfoToast("Please login to report 😊", {
        toastId: REPORT_COMMENT_AUTH_TOAST_ID,
      });
      setShowReportModal(false);
      return;
    }

    if (currentUser?.uid === userId) {
      showInfoToast("You can't report your own comment.", {
        toastId: REPORT_COMMENT_SELF_TOAST_ID,
        autoClose: 1600,
      });
      setShowReportModal(false);
      return;
    }

    try {
      await submitReport({
        type: "comment",
        targetId: commentId,
        reportedBy: currentUser.uid,
      });

      showSuccessToast("Comment reported. Thank you!", {
        toastId: REPORT_COMMENT_SUCCESS_TOAST_ID,
        autoClose: 1400,
      });
    } catch {
      showErrorToast("Report failed. Try again.", {
        toastId: REPORT_COMMENT_ERROR_TOAST_ID,
      });
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

  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };

    const onAnyScroll = () => setIsMenuOpen(false);

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onAnyScroll, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onAnyScroll, true);
    };
  }, [isMenuOpen]);

  const rawReplies = childrenMap?.[commentId] || [];
  const sortedReplies = [...rawReplies].sort((a, b) => {
    const aT =
      a.timestamp?.toMillis?.() || a.timestamp?.toDate?.()?.getTime?.() || 0;
    const bT =
      b.timestamp?.toMillis?.() || b.timestamp?.toDate?.()?.getTime?.() || 0;
    return aT - bT;
  });

  const visibleReplies = sortedReplies.filter((r) => {
    if (!r.deleted) return true;
    const kids = childrenMap?.[r.id] || [];
    return kids.some((k) => !k.deleted);
  });

  const directReplies = visibleReplies.length;

  const handleDelete = async (id) => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const result = await softDeleteComment({ commentId: id });

      if (result?.data?.success) {
        showSuccessToast("Comment removed.", {
          toastId: COMMENT_DELETE_SUCCESS_TOAST_ID,
          autoClose: 1200,
        });
      } else {
        showErrorToast("Error while deleting the comment.", {
          toastId: COMMENT_DELETE_ERROR_TOAST_ID,
        });
      }
    } catch (err) {
      console.error("Error while deleting:", err);
      showErrorToast("Error while deleting the comment.", {
        toastId: COMMENT_DELETE_ERROR_TOAST_ID,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    const trimmed = editedContent.trim();

    if (!trimmed) {
      showErrorToast("Comment cannot be empty!", {
        toastId: COMMENT_EDIT_EMPTY_TOAST_ID,
      });
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
      showErrorToast("Failed to update comment. Please try again.", {
        toastId: COMMENT_EDIT_ERROR_TOAST_ID,
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(content);
  };

  const openMenu = (e) => {
    e.stopPropagation();
    const btn = menuBtnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const left = Math.min(
      window.innerWidth - MENU_WIDTH - MENU_MARGIN,
      Math.max(MENU_MARGIN, r.right - MENU_WIDTH),
    );

    const menuHeightGuess = 140;
    const spaceBelow = window.innerHeight - r.bottom;
    const top =
      spaceBelow > menuHeightGuess + 12
        ? r.bottom + 8
        : Math.max(MENU_MARGIN, r.top - 8 - menuHeightGuess);

    setMenuPos({ top, left });
    setIsMenuOpen(true);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const showParentContext = depth > 0 && parentAuthor?.id;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="py-3"
      >
        <div className="rounded-xl px-2 sm:px-3 py-2.5 hover:bg-zinc-950/20 transition">
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
                <button
                  type="button"
                  title="Top Contributor · Code-powered"
                  className="absolute top-0 right-1.5 translate-x-1/3 -translate-y-1/3 cursor-pointer group"
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
                  aria-label="Show Top Contributor badge info"
                >
                  <ShieldIcon className="absolute -top-2 -right-1 w-5 h-5" />
                </button>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                {/* NEW: clickable author name */}
                {userId ? (
                  <Link
                    to={`/profile/${userId}`}
                    className={`${NAME_LINK_BASE} truncate max-w-[12rem] sm:max-w-[18rem]`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Open profile: ${user?.name || "author"}`}
                    title={user?.name || "Unknown author"}
                  >
                    {user?.name || "Unknown author"}
                  </Link>
                ) : (
                  <span className="font-semibold text-sm text-zinc-100">
                    {user?.name || "Unknown author"}
                  </span>
                )}

                <span className="text-xs text-zinc-500 whitespace-nowrap">
                  {editedDate
                    ? `• edited ${dayjs(editedDate).fromNow()}`
                    : tsDate
                      ? `• ${dayjs(tsDate).fromNow()}`
                      : "• just now"}
                </span>
              </div>

              {showParentContext && (
                <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                  <FiCornerDownRight className="shrink-0" />
                  <span className="min-w-0 truncate">
                    Replying to{" "}
                    <Link
                      to={`/profile/${parentAuthor.id}`}
                      className="text-zinc-300 hover:text-zinc-100 hover:underline underline-offset-4 decoration-zinc-500/70"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Open profile: ${parentAuthor?.name || "user"}`}
                    >
                      @{parentAuthor?.name || "user"}
                    </Link>
                  </span>
                </div>
              )}

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
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 p-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 resize-none max-h-40 overflow-y-auto"
                    aria-label="Edit comment"
                  />
                  <div className="flex gap-3 mt-2 text-sm">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="text-emerald-300 hover:text-emerald-200 hover:underline underline-offset-4"
                      aria-label="Save edited comment"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="text-zinc-400 hover:text-zinc-200 hover:underline underline-offset-4"
                      aria-label="Cancel editing"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : isDeleted ? (
                <p className="italic text-zinc-400 mt-2 [overflow-wrap:anywhere]">
                  This comment has been removed.
                </p>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-zinc-100 [overflow-wrap:anywhere]">
                  {!showAll && seeAllTruncation(content)
                    ? content.slice(0, 150) + "…"
                    : content}
                </p>
              )}

              {showAll && !isDeleted && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                    <button
                      type="button"
                      onClick={() => setIsReplying((v) => !v)}
                      className={
                        disableReplyButton
                          ? "cursor-not-allowed opacity-50 text-zinc-500"
                          : "text-sky-300 hover:text-sky-200 hover:underline underline-offset-4"
                      }
                      disabled={disableReplyButton}
                      aria-label={
                        disableReplyButton
                          ? "Reply disabled"
                          : "Reply to comment"
                      }
                    >
                      Reply
                    </button>

                    <CommentReaction
                      commentId={commentId}
                      currentUserId={currentUser?.uid}
                      locked={locked}
                    />
                  </div>

                  <button
                    ref={menuBtnRef}
                    type="button"
                    onClick={openMenu}
                    className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    aria-label="More actions"
                    aria-expanded={isMenuOpen}
                  >
                    <FiMoreHorizontal />
                  </button>
                </div>
              )}

              {isReplying && !locked && !isDeleted && (
                <CommentForm
                  postId={postID}
                  parentId={commentId}
                  replyingTo={{
                    id: userId,
                    name: user?.name || "user",
                  }}
                  onSubmitSuccess={() => setIsReplying(false)}
                  autoFocus
                  wrapperClassName="mt-3"
                />
              )}

              {showAll && !blockRenderingChildren && directReplies > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setIsRepliesOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-xs text-sky-200 hover:bg-zinc-900/40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    aria-label={isRepliesOpen ? "Hide replies" : "View replies"}
                  >
                    {isRepliesOpen ? <FiChevronUp /> : <FiChevronDown />}
                    <span className="relative top-px">
                      {isRepliesOpen
                        ? "Hide replies"
                        : `View replies (${directReplies})`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {showAll &&
          !blockRenderingChildren &&
          isRepliesOpen &&
          directReplies > 0 && (
            <div
              className={[
                "mt-3 space-y-2 relative",
                "border-l-2 border-zinc-800/40",
                getRepliesIndent(depth),
              ].join(" ")}
            >
              <span
                className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-zinc-800/60"
                aria-hidden="true"
              />

              {visibleReplies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  commentId={reply.id}
                  postID={reply.postID}
                  userId={reply.userID}
                  content={reply.content}
                  timestamp={reply.timestamp}
                  editedAt={reply.editedAt}
                  childrenMap={childrenMap}
                  depth={depth + 1}
                  showAll={showAll}
                  deleted={reply.deleted}
                  locked={locked}
                  disableBadgeModal={disableBadgeModal}
                  maxDepthForReply={maxDepthForReply}
                  maxDepthForRender={maxDepthForRender}
                  parentAuthor={{ id: userId, name: user?.name || "user" }}
                />
              ))}
            </div>
          )}
      </motion.div>

      {isMenuOpen &&
        portalRoot &&
        createPortal(
          <div
            className="fixed inset-0 z-[80]"
            onMouseDown={closeMenu}
            aria-hidden="true"
          >
            <div
              className="fixed"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: MENU_WIDTH,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              role="menu"
            >
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl ring-1 ring-zinc-100/10 p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                    onReportClick();
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60 rounded-lg"
                  role="menuitem"
                >
                  Report
                </button>

                {isAuthor && !locked && !isEditing && canEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu();
                      setIsEditing(true);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60 rounded-lg"
                    role="menuitem"
                  >
                    Edit
                  </button>
                )}

                {canManageComment && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeMenu();
                      setShowConfirmModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/10 rounded-lg"
                    role="menuitem"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            </div>
          </div>,
          portalRoot,
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
  childrenMap: PropTypes.object,
  depth: PropTypes.number,
  showAll: PropTypes.bool,
  deleted: PropTypes.bool,
  locked: PropTypes.bool,
  disableBadgeModal: PropTypes.bool,
  maxDepthForReply: PropTypes.number,
  maxDepthForRender: PropTypes.number,
  parentAuthor: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  }),
};

export default CommentItem;
