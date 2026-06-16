import { useContext, useMemo, useState, memo } from "react";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";

import { FaInfoCircle } from "react-icons/fa";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { FiLock } from "react-icons/fi";
import { MdLockClock } from "react-icons/md";

import { AuthContext } from "../context/AuthContext";
import { useCheckSavedStatus } from "../hooks/useCheckSavedStatus";

import ReactionSummary from "./reactions/ReactionSummary";
import ReactionInfoModal from "./modals/ReactionInfoModal";
import BadgeModal from "./modals/BadgeModal";
import Badge from "./ui/Bagde";

import { toggleSavePost } from "../utils/savedPostUtils";
import { formatPostDateLabel } from "../utils/formatDate";

import { FOCUS_RING, PILL_CATEGORY, PILL_TAG } from "../constants/uiClasses";

/**
 * Compute remaining edit window (7 days from creation).
 *
 * @param {Object} createdAt - Firestore Timestamp-like object with `toDate()`
 * @returns {number|null} Days left to edit, 0 if expired, null if unknown
 */
function getEditDaysLeft(createdAt) {
  if (!createdAt?.toDate) return null;

  const createdDate = createdAt.toDate();
  const expireMs = createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;
  const leftMs = expireMs - Date.now();

  return leftMs > 0 ? Math.ceil(leftMs / (1000 * 60 * 60 * 24)) : 0;
}

const MAX_TAGS_IN_APP = 5;

/**
 * Normalize tag label for display.
 *
 * @param {string} t
 * @returns {string}
 */
const normalizeTagText = (t) => {
  const raw = String(t ?? "").trim();
  if (!raw) return "";
  return raw.replace(/^#+/, "").trim();
};

/**
 * @component PostCardDashboard
 *
 * Management-focused post card for the My Posts dashboard.
 *
 * - Clickable card navigates to `/post/:id`
 * - Keeps save/info/badge affordances available but secondary
 * - Emphasizes post status, title, dates, category, tags, metrics, and actions
 * - Preserves existing edit/archive/delete callback behavior
 */
const PostCardDashboard = ({
  post,
  isMyPost = false,
  showDeleteButton = false,
  onDelete,
  onLock,
}) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [showInfo, setShowInfo] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const postId = post?.id;
  const { isSaved, setIsSaved } = useCheckSavedStatus(user, postId);

  const allTags = useMemo(() => {
    const raw = Array.isArray(post?.tags) ? post.tags : [];

    const normalized = raw
      .map((t) => (typeof t === "string" ? t : (t?.text ?? t?.name ?? "")))
      .map((t) => normalizeTagText(t))
      .filter(Boolean);

    const seen = new Set();
    const unique = [];

    for (const t of normalized) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(t);
      if (unique.length >= MAX_TAGS_IN_APP) break;
    }

    return unique;
  }, [post?.tags]);

  const badgesToShow = useMemo(() => {
    const out = [];
    if (post?.badges?.mostInspiring)
      out.push({ key: "mostInspiring", text: "Most Inspiring" });
    if (post?.badges?.trending) out.push({ key: "trending", text: "Trending" });
    return out.slice(0, 2);
  }, [post?.badges?.mostInspiring, post?.badges?.trending]);

  const editDaysLeft = getEditDaysLeft(post?.createdAt);
  const isEditExpired = editDaysLeft === 0;

  const canEdit =
    isMyPost && !post?.locked && editDaysLeft !== null && !isEditExpired;
  const canLock = isMyPost && !post?.locked;

  const archivedAtDate = post?.lockedAt?.toDate?.();
  const archivedAtLabel = archivedAtDate
    ? archivedAtDate.toLocaleDateString()
    : "";

  const statusLabel = post?.locked
    ? "Archived"
    : isEditExpired
      ? "Edit expired"
      : "Active";

  const statusClass = post?.locked
    ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
    : isEditExpired
      ? "border-zinc-700 bg-zinc-900 text-zinc-300"
      : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";

  const editWindowLabel =
    editDaysLeft === null
      ? "Edit window unavailable"
      : isEditExpired
        ? "Editing disabled after 7 days"
        : `${editDaysLeft} day${editDaysLeft === 1 ? "" : "s"} left to edit`;

  const handleCardClick = () => {
    if (!postId) return;
    navigate(`/post/${postId}`);
  };

  const handleBadgeClick = (e, badgeKey) => {
    e.stopPropagation();
    setSelectedBadge(badgeKey);
    setShowBadgeModal(true);
  };

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    if (!user || !postId) return;

    try {
      const currentUpdated = post?.updatedAt || post?.createdAt;

      const snapshot = {
        postUpdatedAtAtSave: currentUpdated || null,
        postTitleAtSave: post?.title || "",
      };

      const nextState = await toggleSavePost(user, postId, isSaved, snapshot);
      setIsSaved(nextState);
    } catch (err) {
      console.error("Save toggle failed:", err);
    }
  };

  const cardBase =
    "relative w-full overflow-hidden rounded-2xl border border-zinc-800 " +
    "bg-zinc-950 p-4 shadow-sm";
  const cardInteractive =
    "cursor-pointer hover:border-zinc-700 hover:bg-zinc-950/90";
  const cardLocked = post?.locked ? "border-amber-500/20" : "";

  const actionSecondary =
    "ui-button-secondary w-full justify-center px-3 py-2 text-sm sm:w-auto";
  const actionDanger =
    "ui-button w-full justify-center border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/15 sm:w-auto";

  return (
    <>
      <article
        className={`${cardBase} ${cardInteractive} ${cardLocked}`}
        onClick={handleCardClick}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
              >
                {statusLabel}
              </span>

              <span className="text-xs text-zinc-500">
                {formatPostDateLabel(post, { compact: false })}
              </span>

              {post?.category ? (
                <span
                  className={`${PILL_CATEGORY} max-w-full overflow-hidden`}
                  title={post.category}
                >
                  <span className="min-w-0 truncate">{post.category}</span>
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="min-w-0 text-lg font-semibold leading-snug text-zinc-100 sm:text-xl">
                {post?.title || ""}
              </h2>

              {badgesToShow.length > 0 ? (
                <div
                  className="flex shrink-0 flex-wrap items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {badgesToShow.map((b) => (
                    <Badge
                      key={b.key}
                      text={b.text}
                      onClick={(e) => handleBadgeClick(e, b.key)}
                      locked={post?.locked}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {post?.description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400 line-clamp-2">
                {post.description}
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">No description.</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {allTags.length > 0 ? (
                allTags.map((t, idx) => (
                  <span
                    key={`${t}_${idx}`}
                    className={`${PILL_TAG} max-w-none whitespace-nowrap`}
                    title={`#${t}`}
                  >
                    #{t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-zinc-600">No tags</span>
              )}
            </div>
          </div>

          <div
            className="flex shrink-0 items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowInfo(true)}
              aria-label="Reaction info"
              className={`rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100 ${FOCUS_RING}`}
            >
              <FaInfoCircle className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleSaveToggle}
              disabled={!user}
              aria-disabled={!user}
              className={`rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100 disabled:opacity-40 ${FOCUS_RING}`}
              title={isSaved ? "Remove from saved" : "Save this post"}
            >
              {isSaved ? (
                <BsBookmarkFill className="h-4 w-4 text-sky-200" />
              ) : (
                <BsBookmark className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 border-t border-zinc-800 pt-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <ReactionSummary
              postId={postId}
              locked={post?.locked}
              reactionCounts={
                post?.reactionCounts ?? { idea: 0, hot: 0, powerup: 0 }
              }
              userId={user?.uid ?? null}
              postAuthorId={post?.userId ?? post?.author?.id ?? null}
            />

            {isMyPost ? (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                {post?.locked ? (
                  <>
                    <FiLock className="text-sm" />
                    {archivedAtLabel
                      ? `Archived on ${archivedAtLabel}`
                      : "Archived by author"}
                  </>
                ) : (
                  <>
                    <MdLockClock className="text-sm" />
                    {editWindowLabel}
                  </>
                )}
              </span>
            ) : null}
          </div>

          {(isMyPost || showDeleteButton) && (
            <div
              className="grid grid-cols-1 gap-2 sm:flex sm:justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              {canEdit ? (
                <Link
                  to={`/dashboard/edit/${postId}`}
                  className="ui-button-primary w-full justify-center px-4 py-2 text-sm sm:w-auto"
                >
                  Edit
                </Link>
              ) : isMyPost ? (
                <span className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-400 sm:w-auto">
                  {post?.locked ? "Archived" : "Edit unavailable"}
                </span>
              ) : null}

              {canLock && (
                <button
                  type="button"
                  className={actionSecondary}
                  onClick={() => onLock?.(postId)}
                >
                  Archive
                </button>
              )}

              {showDeleteButton && (
                <button
                  type="button"
                  className={actionDanger}
                  onClick={() => onDelete?.(postId)}
                >
                  Move to Trash
                </button>
              )}
            </div>
          )}
        </div>
      </article>

      {showInfo && (
        <ReactionInfoModal
          isOpen={showInfo}
          onClose={() => setShowInfo(false)}
        />
      )}

      {showBadgeModal && (
        <BadgeModal
          isOpen={showBadgeModal}
          badgeKey={selectedBadge}
          locked={post?.locked}
          onClose={() => setShowBadgeModal(false)}
        />
      )}
    </>
  );
};

PostCardDashboard.propTypes = {
  post: PropTypes.object.isRequired,
  isMyPost: PropTypes.bool,
  showDeleteButton: PropTypes.bool,
  onDelete: PropTypes.func,
  onLock: PropTypes.func,
};

export default memo(PostCardDashboard);
