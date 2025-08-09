// CommentItem.jsx
import { useEffect, useState, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { motion } from "framer-motion";

import { auth, db } from "../../firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
// import { deleteComment } from "../../firebase/functions"; // Hard delete kasnije
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
 * Helpers i konstante
 * - Bezbedni timestamp konverteri (rade sa Firestore Timestamp, Date, ISO string, broj ms)
 * - User cache da izbegnemo ponovljene fetch-eve
 * - Preview pravila: koliko odgovora prikazati pre "Show more"
 */

// dayjs: "x minutes ago"
dayjs.extend(relativeTime);

// Safe: pretvara razlicite timestamp tipove u Date ili null
function toDateSafe(ts) {
  if (!ts) return null;
  // Firestore Timestamp
  if (typeof ts.toDate === "function") return ts.toDate();
  // Firestore Timestamp alt (toMillis)
  if (typeof ts.toMillis === "function") return new Date(ts.toMillis());
  // JS Date
  if (ts instanceof Date) return ts;
  // broj ms
  if (typeof ts === "number") return new Date(ts);
  // ISO string
  if (typeof ts === "string") {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

// Safe: vraca broj ms ili 0 ako nema timestamp
function toMs(ts) {
  const d = toDateSafe(ts);
  return d ? d.getTime() : 0;
}

// Safe: "fromNow" tekst ili prazan string
function fromNowSafe(ts) {
  const d = toDateSafe(ts);
  return d ? dayjs(d).fromNow() : "";
}

// Jednostavan cache za korisnike (u memoriji)
const userCache = new Map();
async function getUserCached(userId) {
  if (!userId) return null;
  if (userCache.has(userId)) return userCache.get(userId);
  try {
    const data = await getUserById(userId);
    userCache.set(userId, data);
    return data;
  } catch {
    return null;
  }
}

// Pravila preview-a po nivou
const defaultPreviewRules = {
  rootCount: 2,          // na depth 0 prikazi 2 odgovora pre "Show more"
  childCount: 1,         // na depth >=1 prikazi 1 odgovor pre "Show more"
  showSingleAlways: true // ako node ima tacno 1 dete, uvek ga prikazi
};

const MAX_DEPTH_REPLY = 4; // na >4 onemoguci reply (UX: moze kasnije "Continue thread" view)

/**
 * Komponenta: CommentItem
 */
const CommentItem = ({
  userId,
  content,
  timestamp,
  editedAt,
  postID,
  commentId,
  comments,
  depth = 0,
  showAll = true,
  deleted = false,
  locked = false,
  disableBadgeModal = false,
  repliesPreviewCount, // deprecated: zadrzano radi kompatibilnosti
  previewRules = defaultPreviewRules
}) => {
  // User state
  const [user, setUser] = useState(null);

  // UI state
  const [isReplying, setIsReplying] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [showEditHint, setShowEditHint] = useState(false);
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isRoot = depth === 0;
  const hintShownRef = useRef(false);

  // Safe timestamp vrednosti
  const tsMs = toMs(timestamp);
  const isDeleted = !!deleted;
  const canEdit = tsMs && Date.now() - tsMs <= 10 * 60 * 1000;

  /**
   * Build byParentId mapa (jednom po promeni "comments")
   * - grupisemo decu po parentID
   * - sortiramo jednom po parentu starije -> novije
   * Napomena: zadrzavamo kompatibilnost sa poljima userID/parentID/postID
   */
  const byParentId = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(comments)) return map;

    for (const c of comments) {
      // normalizacija polja
      const pId = c.parentID ?? c.parentId ?? null;
      const arr = map.get(pId) || [];
      arr.push(c);
      map.set(pId, arr);
    }

    for (const [key, arr] of map.entries()) {
      arr.sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
      map.set(key, arr);
    }
    return map;
  }, [comments]);

  // Deca za ovaj cvor
  const replies = useMemo(() => byParentId.get(commentId) || [], [byParentId, commentId]);
  const directReplies = replies.length;

  /**
   * Preview logika:
   * - ako tacno 1 dete i showSingleAlways => 1
   * - inace rootCount ili childCount
   * - repliesPreviewCount (ako prosledjen) moze da pregazi pravila
   */
  let basePreview = isRoot ? previewRules.rootCount : previewRules.childCount;

  if (isRoot && directReplies > 0) {
  basePreview = 1; // uvek prikazi prvi odgovor root komentara
}
  if (typeof repliesPreviewCount === "number") {
    basePreview = repliesPreviewCount;
  }
  const previewN =
    directReplies === 1 && previewRules.showSingleAlways ? 1 : Math.max(0, basePreview);

  /**
   * Ucitavanje user-a uz cache
   */
  useEffect(() => {
    let isMounted = true;
    if (!userId) return;
    (async () => {
      const data = await getUserCached(userId);
      if (isMounted) setUser(data);
    })();
    return () => { isMounted = false; };
  }, [userId]);

  /**
   * Edit hint (do 3 puta po korisniku)
   */
  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid || currentUid !== userId || !canEdit) return;
    if (hintShownRef.current) return;
    hintShownRef.current = true;

    const storageKey = `editedHintCount_${currentUid}`;
    const count = parseInt(localStorage.getItem(storageKey) || "0", 10);
    if (count >= 3) return;

    setShowEditHint(true);
    localStorage.setItem(storageKey, String(count + 1));
    const timerId = setTimeout(() => setShowEditHint(false), 10_000);
    return () => clearTimeout(timerId);
  }, [userId, canEdit]);

  /**
   * Handleri
   */
  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      const result = await softDeleteComment({ commentId: id });
      if (result?.data?.success) {
        showSuccessToast("Comment removed.");
      } else {
        showErrorToast("Delete failed. Please try again.");
      }
    } catch (err) {
      console.error("Error while deleting:", err);
      showErrorToast("Error while deleting the comment.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    const next = (editedContent || "").trim();
    const original = (content || "").trim();

    if (!next) {
      showErrorToast("Comment cannot be empty!");
      return;
    }
    if (next === original) {
      setIsEditing(false);
      return;
    }

    try {
      const commentRef = doc(db, "comments", commentId);
      await updateDoc(commentRef, {
        content: next,
        editedAt: serverTimestamp()
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

  const editedLabel = editedAt ? `• edited ${fromNowSafe(editedAt)}` : `• ${fromNowSafe(timestamp)}`;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="group comment-item py-4 px-2 border-b last:border-none hover:bg-gray-50"
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user ? (
              <img
                src={user?.profilePicture || DEFAULT_PROFILE_PICTURE}
                alt={`Profile picture of ${user?.name || "User"}`}
                className={`w-8 h-8 rounded-full object-cover ${
                  user?.badges?.topContributor ? "ring-2 ring-purple-800" : ""
                }`}
              />
            ) : (
              // very light skeleton dok user stigne
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            )}

            {user?.badges?.topContributor && (
              <div
                title="Top Contributor · Code-powered"
                className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  if (disableBadgeModal) return;
                  setShowTopContributorModal(true);
                }}
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
                {user?.name || "User"}
              </span>
              <span className="text-xs text-gray-500">{editedLabel}</span>
              {showEditHint && (
                <span className="ml-2 text-xs text-blue-600">
                  Tip: you can edit your comment for 10 minutes after posting.
                </span>
              )}
            </div>

            {/* Sadrzaj / edit / obrisan */}
            {isEditing ? (
              <div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full p-2 border rounded mt-2"
                />
                <div className="flex gap-3 mt-2 text-sm">
                  <button onClick={handleSave} className="text-green-600 hover:underline">
                    Save
                  </button>
                  <button onClick={handleCancel} className="text-gray-500 hover:underline">
                    Cancel
                  </button>
                </div>
              </div>
            ) : isDeleted ? (
              <p className="italic text-gray-500 mt-1">This comment has been removed.</p>
            ) : (
              <p className="text-[0.95rem] leading-relaxed text-gray-800 mt-1 whitespace-pre-wrap">
                {!showAll && content && content.length > 150 ? content.slice(0, 150) + "…" : content}
              </p>
            )}

            {/* Akcije */}
            {showAll && !isDeleted && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                {!locked &&
                  (depth < MAX_DEPTH_REPLY ? (
                    <button
                      onClick={() => setIsReplying((v) => !v)}
                      className="hover:underline text-blue-600"
                      aria-expanded={isReplying}
                    >
                      Reply
                    </button>
                  ) : (
                    <button
                      disabled
                      title="Reply disabled at this depth"
                      className="cursor-not-allowed opacity-50"
                    >
                      Reply
                    </button>
                  ))}

                {!locked && (
                  <button onClick={() => {}} className="hover:underline">
                    Report
                  </button>
                )}

                <div className="h-4 w-px bg-gray-300" />

                <div className="inline-flex items-center">
                  <CommentReaction
                    commentId={commentId}
                    currentUserId={auth.currentUser?.uid}
                    locked={locked}
                  />
                </div>

                {auth.currentUser?.uid === userId && !locked && (
                  <>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="hover:underline"
                      >
                        Edit
                      </button>
                    )}

                    {!isDeleting ? (
                      <button
                        onClick={() => setShowConfirmModal(true)}
                        className="hover:underline"
                      >
                        Delete
                      </button>
                    ) : (
                      <span>Deleting…</span>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Reply forma */}
            {isReplying && (
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

        {/* REPLIES: per-node preview + lokalni toggle */}
        {showAll && directReplies > 0 && (
          <div className="mt-2 ml-5">
            <div className="relative pl-5 border-l border-gray-200">
              {(expanded ? replies : replies.slice(0, previewN)).map((reply) => {
                const replyUserId = reply.userID ?? reply.userId; // kompatibilnost
                return (
                  <div key={reply.id} className="relative">
                    {/* node tacka + elbow */}
                    <span className="absolute -left-[5px] top-5 w-2 h-2 bg-gray-300 rounded-full" />
                    <span className="absolute -left-5 top-5 w-5 border-t border-gray-200" />

                    <CommentItem
                      commentId={reply.id}
                      postID={reply.postID ?? reply.postId}
                      userId={replyUserId}
                      content={reply.content}
                      timestamp={reply.timestamp}
                      comments={comments}
                      editedAt={reply.editedAt}
                      deleted={reply.deleted}
                      depth={depth + 1}
                      showAll={showAll}
                      locked={locked}
                      disableBadgeModal={disableBadgeModal}
                      previewRules={previewRules}
                    />
                  </div>
                );
              })}

              {directReplies > previewN && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="my-1 text-xs text-blue-600 hover:underline"
                  aria-expanded={expanded}
                >
                  {expanded
                    ? "Show less"
                    : `Show replies (${directReplies - previewN})`}
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
  timestamp: PropTypes.any,
  postID: PropTypes.string.isRequired,
  commentId: PropTypes.string.isRequired,
  comments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      userID: PropTypes.string,     // kompatibilnost
      userId: PropTypes.string,     // kompatibilnost
      content: PropTypes.string.isRequired,
      timestamp: PropTypes.any,
      postID: PropTypes.string,
      postId: PropTypes.string,
      parentID: PropTypes.string,
      parentId: PropTypes.string
    })
  ).isRequired,
  depth: PropTypes.number,
  showAll: PropTypes.bool,
  editedAt: PropTypes.any,
  deleted: PropTypes.bool,
  locked: PropTypes.bool,
  disableBadgeModal: PropTypes.bool,
  repliesPreviewCount: PropTypes.number, // deprecated
  previewRules: PropTypes.shape({
    rootCount: PropTypes.number,
    childCount: PropTypes.number,
    showSingleAlways: PropTypes.bool
  })
};

export default CommentItem;
