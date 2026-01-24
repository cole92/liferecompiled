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
import AuthorLink from "./AuthorLink";
import ShieldIcon from "./ui/ShieldIcon";
import Avatar from "./common/Avatar";

import { toggleSavePost } from "../utils/savedPostUtils";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

import {
  FOCUS_RING,
  PILL_CATEGORY,
  PILL_TAG,
  PILL_META,
} from "../constants/uiClasses";

function formatPostDate(post) {
  const ts = post?.updatedAt || post?.createdAt;
  if (!ts?.toDate) return "";
  return post?.updatedAt
    ? `Last edited: ${ts.toDate().toLocaleDateString()}`
    : `Posted: ${ts.toDate().toLocaleDateString()}`;
}

function formatPostDateCompact(post) {
  const ts = post?.updatedAt || post?.createdAt;
  if (!ts?.toDate) return "";
  const d = ts.toDate().toLocaleDateString();
  return post?.updatedAt ? `Edited: ${d}` : `Posted: ${d}`;
}

function getEditDaysLeft(createdAt) {
  if (!createdAt?.toDate) return null;

  const createdDate = createdAt.toDate();
  const expireMs = createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;
  const leftMs = expireMs - Date.now();

  return leftMs > 0 ? Math.ceil(leftMs / (1000 * 60 * 60 * 24)) : 0;
}

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
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);

  const { isSaved, setIsSaved } = useCheckSavedStatus(user, post.id);

  const tags = Array.isArray(post?.tags) ? post.tags : [];
  const visibleTagsXs = tags.slice(0, 2);
  const visibleTagsSm = tags.slice(0, 3);
  const extraTagsCountXs = Math.max(0, tags.length - visibleTagsXs.length);
  const extraTagsCountSm = Math.max(0, tags.length - visibleTagsSm.length);

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

  const handleCardClick = () => {
    navigate(`/post/${post.id}`);
  };

  const handleBadgeClick = (e, badgeKey) => {
    e.stopPropagation();
    setSelectedBadge(badgeKey);
    setShowBadgeModal(true);
  };

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    if (!user) return;

    const currentUpdated = post?.updatedAt || post?.createdAt;

    const snapshot = {
      postUpdatedAtAtSave: currentUpdated || null,
      postTitleAtSave: post?.title || "",
    };

    const nextState = await toggleSavePost(user, post.id, isSaved, snapshot);
    setIsSaved(nextState);
  };

  const cardBase =
    "relative w-full h-full overflow-hidden p-4 " +
    "rounded-2xl border border-zinc-800/70 " +
    "bg-gradient-to-b from-sky-500/10 via-zinc-950/20 to-zinc-950/30 " +
    "ring-1 ring-sky-200/10 shadow-sm " +
    "flex flex-col transition-colors transition-shadow duration-200";

  const cardInteractive =
    "cursor-pointer hover:shadow-md hover:ring-sky-200/20 hover:border-sky-300/20";

  const cardLocked = post?.locked
    ? "opacity-70 grayscale saturate-0 bg-zinc-950/80 border-zinc-800/90 ring-zinc-100/5"
    : "";

  const pillEditInfo =
    "inline-flex items-center gap-1 rounded-full " +
    "border border-sky-500/20 bg-sky-500/10 " +
    "px-2 py-0.5 text-[11px] font-medium text-sky-200 whitespace-nowrap " +
    "sm:px-2.5 sm:py-0.5 sm:text-xs";

  return (
    <>
      <article
        className={`${cardBase} ${cardInteractive} ${cardLocked}`}
        onClick={handleCardClick}
      >
        {/* Header: author + (info/save) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="relative shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Avatar
                src={post?.author?.profilePicture || DEFAULT_PROFILE_PICTURE}
                size={40}
                zoomable
                badge={post?.author?.badges?.topContributor}
              />

              {post?.author?.badges?.topContributor && (
                <button
                  type="button"
                  className="group absolute -top-2 -right-1 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTopContributorModal(true);
                  }}
                  aria-label="Top contributor info"
                  title="Top Contributor"
                >
                  <ShieldIcon className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>

            {post?.author?.id ? (
              <span className="min-w-0" onClick={(e) => e.stopPropagation()}>
                <AuthorLink author={post.author}>
                  <span className="font-semibold text-sm text-zinc-100 line-clamp-1">
                    {post.author.name}
                  </span>
                </AuthorLink>
              </span>
            ) : (
              <span className="font-semibold text-sm text-zinc-500 line-clamp-1 min-w-0">
                {post?.author?.name || "Unknown"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowInfo(true);
              }}
              aria-label="Info"
              className={`rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-950/25 transition ${FOCUS_RING}`}
            >
              <FaInfoCircle className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleSaveToggle}
              disabled={!user}
              aria-disabled={!user}
              className={`rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-950/25 transition disabled:opacity-40 disabled:hover:bg-transparent ${FOCUS_RING}`}
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

        {/* Title + badges */}
        <div className="mt-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-snug text-zinc-100 min-w-0 line-clamp-2 min-h-[3.25rem] break-words">
            {post?.title || ""}
          </h2>

          {badgesToShow.length > 0 ? (
            <div className="shrink-0 flex items-center gap-1">
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

        {/* Meta: date + category */}
        <div className="mt-2 flex items-center gap-3 min-w-0 text-xs text-zinc-400">
          {/* date: dozvoli da se po potrebi skrati na 320px */}
          <span className="min-w-0 max-w-[7.75rem] truncate whitespace-nowrap text-[11px] sm:max-w-none sm:text-xs sm:shrink-0">
            <span className="sm:hidden">{formatPostDateCompact(post)}</span>
            <span className="hidden sm:inline">{formatPostDate(post)}</span>
          </span>

          {post?.category ? (
            <span className="min-w-0 flex-1 flex justify-end">
              {/* pill wrapper */}
              <span
                className={`${PILL_CATEGORY} max-w-full overflow-hidden`}
                title={post.category}
              >
                {/* tekst je taj koji trunca */}
                <span className="min-w-0 truncate">{post.category}</span>
              </span>
            </span>
          ) : (
            <span className="flex-1" aria-hidden="true" />
          )}
        </div>

        {/* Description */}
        {post?.description ? (
          <p className="mt-2 text-sm text-zinc-300 line-clamp-3 min-h-[3.75rem] break-words">
            {post.description}
          </p>
        ) : (
          <div className="mt-2 min-h-[3.75rem]" aria-hidden="true" />
        )}

        {/* Bottom: tags + reactions + management */}
        <div className="mt-auto pt-3 border-t border-zinc-800/60">
          {/* Tags row */}
          <div className="min-h-[2.25rem]">
            {/* XS: 2 tags */}
            <div className="flex flex-nowrap items-center gap-2 overflow-hidden sm:hidden">
              {visibleTagsXs.map((tag, idx) => (
                <span
                  key={`${tag.text}-${idx}`}
                  className={`${PILL_TAG} shrink min-w-0 max-w-[48%] truncate`}
                  title={`#${tag.text}`}
                >
                  #{tag.text}
                </span>
              ))}

              {extraTagsCountXs > 0 && (
                <span className={`${PILL_META} shrink-0`}>
                  +{extraTagsCountXs}
                </span>
              )}
            </div>

            {/* SM+: 3 tags */}
            <div className="hidden sm:flex flex-nowrap items-center gap-2 overflow-hidden">
              {visibleTagsSm.map((tag, idx) => (
                <span
                  key={`${tag.text}-${idx}`}
                  className={`${PILL_TAG} shrink min-w-0 max-w-[12rem] truncate`}
                  title={`#${tag.text}`}
                >
                  #{tag.text}
                </span>
              ))}

              {extraTagsCountSm > 0 && (
                <span className={`${PILL_META} shrink-0`}>
                  +{extraTagsCountSm}
                </span>
              )}
            </div>
          </div>

          {/* Reactions */}
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <ReactionSummary
              postId={post.id}
              locked={post?.locked}
              reactionCounts={
                post?.reactionCounts ?? { idea: 0, hot: 0, powerup: 0 }
              }
            />
          </div>

          {/* Management strip */}
          {(isMyPost || showDeleteButton) && (
            <div
              className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              {/* LEFT: Edit + status pills */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {canEdit && (
                  <Link
                    to={`/dashboard/edit/${post.id}`}
                    className="ui-button-primary inline-flex justify-center text-xs px-4 py-1.5 min-w-[72px] sm:text-sm sm:px-4 sm:py-2"
                  >
                    Edit
                  </Link>
                )}

                {post?.locked && (
                  <span
                    className={`${PILL_META} inline-flex items-center gap-1 min-w-0`}
                    title={
                      archivedAtLabel
                        ? `Archived on: ${archivedAtLabel}`
                        : "Archived by author"
                    }
                  >
                    <FiLock className="text-sm" />
                    <span className="min-w-0 truncate">
                      <span className="sm:hidden">Archived</span>
                      <span className="hidden sm:inline">
                        Archived by author
                      </span>
                    </span>
                  </span>
                )}

                {isMyPost &&
                  !post?.locked &&
                  editDaysLeft !== null &&
                  !isEditExpired && (
                    <span
                      className={pillEditInfo}
                      title={`Editing will be disabled after 7 days. ${editDaysLeft} day${
                        editDaysLeft === 1 ? "" : "s"
                      } left.`}
                    >
                      <MdLockClock className="text-sm" />
                      <span className="sm:hidden">Edit: {editDaysLeft}d</span>
                      <span className="hidden sm:inline">
                        Edit: {editDaysLeft}d left
                      </span>
                    </span>
                  )}

                {isMyPost &&
                  !post?.locked &&
                  editDaysLeft !== null &&
                  isEditExpired && (
                    <span
                      className={`${pillEditInfo} opacity-80`}
                      title="Editing is disabled after 7 days"
                    >
                      <span className="sm:hidden">Edit disabled</span>
                      <span className="hidden sm:inline">
                        Edit disabled (7d)
                      </span>
                    </span>
                  )}
              </div>

              {/* RIGHT: destructive actions (NO WRAP) */}
              <div className="flex items-center gap-2 shrink-0">
                {canLock && (
                  <button
                    type="button"
                    className="rounded-lg bg-rose-500/15 whitespace-nowrap px-2.5 py-1.5 text-xs font-semibold text-rose-200 ring-1 ring-rose-500/25 hover:bg-rose-500/25 transition sm:px-3 sm:py-2 sm:text-sm"
                    onClick={() => onLock?.(post.id)}
                  >
                    <span className="sm:hidden">Archive</span>
                    <span className="hidden sm:inline">Archive post</span>
                  </button>
                )}

                {showDeleteButton && (
                  <button
                    type="button"
                    className="rounded-lg bg-rose-500/15 whitespace-nowrap px-2.5 py-1.5 text-xs font-semibold text-rose-200 ring-1 ring-rose-500/25 hover:bg-rose-500/25 transition sm:px-3 sm:py-2 sm:text-sm"
                    onClick={() => onDelete?.(post.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
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

      {showTopContributorModal && (
        <BadgeModal
          isOpen={showTopContributorModal}
          locked={post?.locked}
          authorBadge="topContributor"
          onClose={() => setShowTopContributorModal(false)}
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
