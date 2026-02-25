import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import PropTypes from "prop-types";

import { FiLock } from "react-icons/fi";
import { FaInfoCircle } from "react-icons/fa";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { MdLockClock } from "react-icons/md";

import { auth } from "../firebase";
import { AuthContext } from "../context/AuthContext";

import { useCheckSavedStatus } from "../hooks/useCheckSavedStatus";

import ReactionSummary from "./reactions/ReactionSummary";
import Comments from "./comments/Comments";
import ReactionInfoModal from "./modals/ReactionInfoModal";
import BadgeModal from "./modals/BadgeModal";
import Badge from "./ui/Bagde";
import AuthorLink from "./AuthorLink";
import ShieldIcon from "./ui/ShieldIcon";
import Avatar from "./common/Avatar";

import { toggleSavePost } from "../utils/savedPostUtils";

import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

/**
 * @component PostCard
 *
 * Interactive post card used across multiple feeds (Home, MyPosts, Saved, Trash).
 *
 * Responsibilities:
 * - Displays post meta (title, author, description, tags, category, timestamps)
 * - Handles interactions: open details, save/unsave, reactions, comments, badge modals
 * - Supports unified Trash UX (restore window + permanent delete)
 * - Respects lock state: locked posts are effectively read-only for reactions/comments
 *
 * Variants:
 * - Regular: card is clickable and navigates to `/post/:id`
 * - Trash mode: not clickable, shows TTL badge + restore/delete actions
 * - MyPosts: shows Edit button + auto-lock countdown (first 7 days)
 *
 * Notes:
 * - `showCommentsThread=false` disables thread rendering without changing Comments logic
 *
 * @returns {JSX.Element}
 */
const PostCard = ({
  post,
  showDeleteButton = false,
  onDelete,
  onRestore,
  onDeletePermanently,
  isTrashMode = false,
  isMyPost = false,
  daysLeft,
  onLock,
  showCommentsThread = true,
}) => {
  const {
    title,
    description,
    createdAt,
    deletedAt,
    updatedAt,
    author,
    category,
  } = post;

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const formattedDate = post.lockedAt?.toDate().toLocaleDateString();

  const [showModal, setShowModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  const { isSaved, setIsSaved } = useCheckSavedStatus(user, post.id);

  const createdDate = post.createdAt?.toDate?.();
  const isAutoLocked =
    createdDate && Date.now() > createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;

  const handleClick = () => {
    if (isTrashMode) return;
    navigate(`/post/${post.id}`);
  };

  const getBadgeColor = (daysLeft) => {
    if (daysLeft > 20)
      return "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
    if (daysLeft > 10)
      return "border border-amber-500/25 bg-amber-500/10 text-amber-200";
    if (daysLeft > 0)
      return "border border-rose-500/25 bg-rose-500/10 text-rose-200";
    return "border border-zinc-700 bg-zinc-950/40 text-zinc-200";
  };

  const calculateDaysLeft = (createdAt) => {
    if (!createdAt?.toDate) return 0;

    const createdDate = createdAt.toDate();
    const expireDate = createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;
    const timeLeft = expireDate - Date.now();

    return timeLeft > 0 ? Math.ceil(timeLeft / (1000 * 60 * 60 * 24)) : 0;
  };

  const handleBadgeClick = (e, badgeKey) => {
    e.stopPropagation();
    setSelectedBadge(badgeKey);
    setShowBadgeModal(true);
  };

  const handleSaveToggle = async (e) => {
    e.stopPropagation();

    // Snapshot helps SavedPosts detect stale saves after edits (title/updatedAt)
    const currentUpdated = updatedAt || createdAt;

    const snapshot = {
      postUpdatedAtAtSave: currentUpdated || null,
      postTitleAtSave: title || "",
    };

    const newState = await toggleSavePost(user, post.id, isSaved, snapshot);
    setIsSaved(newState);
  };

  const cardBase =
    "ui-card relative w-full overflow-hidden p-4 shadow-sm transition duration-200";
  const cardInteractive = isTrashMode
    ? ""
    : "cursor-pointer hover:shadow-md hover:scale-[1.01]";
  const cardTrending = post.badges?.trending ? "ring-2 ring-rose-500/40" : "";

  return (
    <>
      <div
        className={`${cardBase} ${cardInteractive} ${cardTrending}`}
        onClick={handleClick}
      >
        {/* Top-right actions: keep Info + Delete separated (no overlap) */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
          {showDeleteButton && (
            <button
              type="button"
              className="rounded-lg bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-200 ring-1 ring-rose-500/25 hover:bg-rose-500/25 transition"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(post.id);
              }}
            >
              Delete
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
            aria-label="Info"
            className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            <FaInfoCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Clickable badge chips (Most Inspiring / Trending) */}
        <div className="absolute top-2 right-16 z-10 flex flex-col gap-1">
          {post.badges?.mostInspiring && (
            <Badge
              text="Most Inspiring"
              onClick={(e) => handleBadgeClick(e, "mostInspiring")}
              locked={post.locked && !isTrashMode}
            />
          )}
          {post.badges?.trending && (
            <Badge
              text="Trending"
              onClick={(e) => handleBadgeClick(e, "trending")}
              locked={post.locked && !isTrashMode}
            />
          )}
        </div>

        <div
          className={`${
            post.locked && !isTrashMode
              ? "opacity-80 grayscale hover:opacity-100 transition duration-200"
              : ""
          }`}
        >
          {/* Author row */}
          <div className="flex items-center gap-2">
            <div className="relative inline-block">
              <Avatar
                src={author.profilePicture || DEFAULT_PROFILE_PICTURE}
                size={40}
                zoomable
                badge={author.badges?.topContributor}
              />

              {author.badges?.topContributor && (
                <div
                  title="Top Contributor · Code-powered"
                  className="group relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTopContributorModal(true);
                  }}
                >
                  <ShieldIcon className="w-5 h-5 absolute -top-11 -right-1 group-hover:scale-110 transition-transform" />
                </div>
              )}
            </div>

            {author?.id ? (
              <AuthorLink author={author}>
                <span className="font-semibold text-sm text-zinc-100">
                  {author.name}
                </span>
              </AuthorLink>
            ) : (
              <span className="font-semibold text-sm text-zinc-500">
                {author.name}
              </span>
            )}
          </div>

          {/* Lock state indicators */}
          {post.locked && !isTrashMode && (
            <div className="mt-3 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-200"
                title="This post is locked and cannot be edited or commented"
              >
                <FiLock className="text-sm" />
                Locked by author on: {`${formattedDate}`}
              </span>
            </div>
          )}

          {post.locked && isTrashMode && (
            <div className="mt-3">
              <span
                className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-200"
                title="This post was locked before being deleted"
              >
                🔒 Locked before deletion
              </span>
            </div>
          )}

          {/* MyPosts: manual lock action (only when unlocked) */}
          {isMyPost && post.locked === false && (
            <div className="mt-3">
              <button
                type="button"
                className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 ring-1 ring-rose-500/25 hover:bg-rose-500/25 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  onLock(post.id);
                }}
              >
                Lock this post
              </button>
            </div>
          )}

          {/* Title + Save */}
          <div className="mt-3 flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold leading-snug text-zinc-100">
              {title}
            </h2>

            <button
              type="button"
              onClick={handleSaveToggle}
              className="shrink-0 rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              title={isSaved ? "Remove from saved" : "Save this post"}
            >
              {isSaved ? (
                <BsBookmarkFill className="h-4 w-4 text-sky-200" />
              ) : (
                <BsBookmark className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Trash TTL badge (restore window) */}
          {isTrashMode && daysLeft !== null && (
            <div className="mt-2">
              <span
                className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getBadgeColor(
                  daysLeft,
                )}`}
              >
                ⏳{" "}
                {daysLeft === 0
                  ? "Last chance to restore!"
                  : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left to restore`}
              </span>
            </div>
          )}

          {/* Description */}
          <p className="mt-2 text-sm text-zinc-300">{description}</p>

          {/* Dates */}
          {!isTrashMode && (
            <span className="mt-3 block text-xs text-zinc-400">
              {updatedAt
                ? `Last edited on: ${updatedAt.toDate().toLocaleDateString()}`
                : `Posted on: ${createdAt.toDate().toLocaleDateString()}`}
            </span>
          )}

          {isTrashMode && deletedAt && (
            <span className="mt-3 block text-xs text-zinc-400">
              {updatedAt
                ? `Last edited on: ${updatedAt.toDate().toLocaleDateString()}`
                : `Posted on: ${createdAt.toDate().toLocaleDateString()}`}
            </span>
          )}

          {/* Tags + Category */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {post.tags.map((tag, index) => (
              <span
                key={`${tag.text}-${index}`}
                className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-200"
              >
                #{tag.text}
              </span>
            ))}

            <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-0.5 text-xs font-semibold text-zinc-200">
              {category}
            </span>
          </div>

          {/* Reactions (disabled in Trash mode) */}
          {!isTrashMode && (
            <div className="mt-4">
              <ReactionSummary
                postId={post.id}
                locked={post.locked}
                reactionCounts={
                  post.reactionCounts ?? { idea: 0, hot: 0, powerup: 0 }
                }
              />
            </div>
          )}

          {/* Comments thread (optional, does not affect Comments internals) */}
          {!isTrashMode && showCommentsThread && (
            <div className="mt-4">
              <Comments
                postID={post.id}
                userId={auth.currentUser?.uid}
                locked={post.locked}
              />
            </div>
          )}

          {/* MyPosts: edit + countdown (only within 7-day edit window) */}
          {!isTrashMode && isMyPost && !post.locked && !isAutoLocked && (
            <div className="mt-4">
              <Link
                to={`/dashboard/edit/${post.id}`}
                onClick={(e) => e.stopPropagation()}
                className="ui-button-primary inline-flex"
              >
                Edit
              </Link>

              <p className="mt-2 flex items-center gap-1 text-xs text-zinc-400 italic">
                <MdLockClock className="text-sky-400" />
                {calculateDaysLeft(post.createdAt)} day
                {calculateDaysLeft(post.createdAt) !== 1 ? "s" : ""} left to
                edit this post
              </p>
            </div>
          )}

          {/* Auto-lock notice (MyPosts only) */}
          {isAutoLocked && isMyPost && (
            <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-200">
              <strong>Note:</strong> Editing is disabled. This post was locked
              after 7 days.
            </div>
          )}

          {/* Trash actions */}
          {isTrashMode && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRestore}
                className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-500/25 hover:bg-emerald-500/25 transition"
              >
                Restore
              </button>

              <button
                type="button"
                onClick={onDeletePermanently}
                className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-semibold text-rose-200 ring-1 ring-rose-500/25 hover:bg-rose-500/25 transition"
              >
                Delete Permanently
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ReactionInfoModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}

      {showBadgeModal && (
        <BadgeModal
          isOpen={showBadgeModal}
          badgeKey={selectedBadge}
          locked={post.locked && !isTrashMode}
          onClose={() => setShowBadgeModal(false)}
        />
      )}

      {showTopContributorModal && (
        <BadgeModal
          isOpen={showTopContributorModal}
          locked={post.locked && !isTrashMode}
          authorBadge="topContributor"
          onClose={() => setShowTopContributorModal(false)}
        />
      )}
    </>
  );
};

PostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    createdAt: PropTypes.object.isRequired,
    updatedAt: PropTypes.object,
    deletedAt: PropTypes.object,
    lockedAt: PropTypes.object,
    locked: PropTypes.bool,

    tags: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
      }),
    ).isRequired,

    author: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
      name: PropTypes.string.isRequired,
      profilePicture: PropTypes.string,
      badges: PropTypes.shape({
        topContributor: PropTypes.bool,
      }),
    }).isRequired,

    comments: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
      }),
    ),

    reactionCounts: PropTypes.shape({
      idea: PropTypes.number,
      hot: PropTypes.number,
      powerup: PropTypes.number,
    }),

    badges: PropTypes.shape({
      mostInspiring: PropTypes.bool,
      trending: PropTypes.bool,
    }),
  }).isRequired,

  showDeleteButton: PropTypes.bool,
  onDelete: PropTypes.func,
  isTrashMode: PropTypes.bool,
  isMyPost: PropTypes.bool,
  onRestore: PropTypes.func,
  onDeletePermanently: PropTypes.func,
  daysLeft: PropTypes.number,
  onLock: PropTypes.func,
  showCommentsThread: PropTypes.bool,
};

export default PostCard;
