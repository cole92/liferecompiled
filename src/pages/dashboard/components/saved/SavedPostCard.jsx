import PropTypes from "prop-types";
import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { FiLock } from "react-icons/fi";

import { AuthContext } from "../../../../context/AuthContext";
import { useCheckSavedStatus } from "../../../../hooks/useCheckSavedStatus";

import Badge from "../../../../components/ui/Bagde";
import Avatar from "../../../../components/common/Avatar";

import { toggleSavePost } from "../../../../utils/savedPostUtils";
import { DEFAULT_PROFILE_PICTURE } from "../../../../constants/defaults";

import {
  FOCUS_RING,
  PILL_CATEGORY,
  PILL_TAG,
  PILL_META,
} from "../../../../constants/uiClasses";

const CONTENT_PREVIEW_MAX = 300;

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

const SavedPostCard = ({ post, onUnsave, isPendingUndo = false }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

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

  const handleCardClick = () => navigate(`/post/${post.id}`);

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    if (!user) return;
    if (isPendingUndo) return;

    if (onUnsave) {
      onUnsave(post);
      return;
    }

    const currentUpdated = post?.updatedAt || post?.createdAt;

    const snapshot = {
      postUpdatedAtAtSave: currentUpdated || null,
      postTitleAtSave: post?.title || "",
    };

    const newState = await toggleSavePost(user, post.id, isSaved, snapshot);
    setIsSaved(newState);
  };

  const cutoff = post?.postUpdatedAtAtSave;
  let isUpdatedSinceSaved = false;

  if (cutoff && (post?.updatedAt || post?.createdAt)) {
    const current = (post.updatedAt || post.createdAt)?.toMillis
      ? (post.updatedAt || post.createdAt).toMillis()
      : post.updatedAt || post.createdAt;

    const cutoffMs = cutoff?.toMillis ? cutoff.toMillis() : cutoff;
    isUpdatedSinceSaved = Number(current) > Number(cutoffMs);
  }

  const cardBase =
    "relative w-full h-full overflow-hidden p-4 " +
    "rounded-2xl border border-zinc-800/70 " +
    "bg-gradient-to-b from-sky-500/10 via-zinc-950/20 to-zinc-950/30 " +
    "ring-1 ring-sky-200/10 shadow-sm " +
    "flex flex-col transition-colors transition-shadow duration-200";

  const cardInteractive = post?.locked
    ? "cursor-pointer"
    : "cursor-pointer hover:shadow-md hover:ring-sky-200/20 hover:border-sky-300/20";

  const cardLocked = post?.locked
    ? "opacity-60 grayscale saturate-0 bg-zinc-950/80 border-zinc-800/90 ring-zinc-100/5"
    : "";

  if (post.isRemoved) {
    const handleRemoveClick = async (e) => {
      e.stopPropagation();
      if (isPendingUndo) return;

      if (onUnsave) {
        onUnsave(post);
        return;
      }

      if (!user) return;
      await toggleSavePost(user, post.id, true);
    };

    return (
      <article
        className={`${cardBase} ${cardInteractive}`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-snug text-zinc-100 line-clamp-1 break-words">
              {post.postTitleAtSave ||
                post.title ||
                "Post is no longer available"}
            </h2>
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
              <span className={PILL_META}>Unavailable</span>
              <span className="line-clamp-1">
                Saved on:{" "}
                {post.savedAt?.toDate?.().toLocaleDateString?.() || "unknown"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemoveClick}
            disabled={isPendingUndo}
            aria-disabled={isPendingUndo}
            className={
              `shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ` +
              `border border-rose-500/25 bg-rose-500/10 text-rose-200 ` +
              `hover:bg-rose-500/15 hover:border-rose-400/30 ` +
              `${isPendingUndo ? "opacity-60 cursor-not-allowed" : ""} ${FOCUS_RING}`
            }
            title={isPendingUndo ? "Undo pending..." : "Remove from saved"}
          >
            Remove
          </button>
        </div>

        <p className="mt-3 text-sm text-zinc-300 break-words">
          This post was removed by its author and is no longer available.
        </p>

        <div className="mt-auto pt-3 border-t border-zinc-800/60" />
      </article>
    );
  }

  const previewText = post?.description
    ? post.description
    : post?.content
      ? post.content.slice(0, CONTENT_PREVIEW_MAX)
      : "";

  const archivedAtLabel = post?.lockedAt?.toDate?.()
    ? post.lockedAt.toDate().toLocaleDateString()
    : "";

  return (
    <article
      className={`${cardBase} ${cardInteractive} ${cardLocked}`}
      onClick={handleCardClick}
    >
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
          </div>

          <span className="min-w-0">
            <span className="font-semibold text-sm text-zinc-100 line-clamp-1">
              {post?.author?.name || "Unknown"}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveToggle}
          disabled={isPendingUndo}
          aria-disabled={isPendingUndo}
          className={`rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-950/25 transition ${
            isPendingUndo ? "opacity-50 cursor-not-allowed" : ""
          } ${FOCUS_RING}`}
          title={
            isPendingUndo
              ? "Undo pending..."
              : isSaved
                ? "Remove from saved"
                : "Save this post"
          }
        >
          {isSaved ? (
            <BsBookmarkFill className="h-4 w-4 text-sky-200" />
          ) : (
            <BsBookmark className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold leading-snug text-zinc-100 min-w-0 line-clamp-2 min-h-[3.25rem] break-words">
          {post?.title || ""}
        </h2>

        {badgesToShow.length > 0 ? (
          <div className="shrink-0 flex items-center gap-1">
            {badgesToShow.map((b) => (
              <Badge key={b.key} text={b.text} />
            ))}
          </div>
        ) : null}
      </div>

      {/* Meta: XS-safe date + category */}
      <div className="mt-2 flex items-center gap-3 min-w-0 text-xs text-zinc-400">
        <span className="min-w-0 max-w-[7.75rem] truncate whitespace-nowrap text-[11px] sm:max-w-none sm:text-xs sm:shrink-0">
          <span className="sm:hidden">{formatPostDateCompact(post)}</span>
          <span className="hidden sm:inline">{formatPostDate(post)}</span>
        </span>

        {post?.category ? (
          <span className="min-w-0 flex-1 flex justify-end">
            <span
              className={`${PILL_CATEGORY} max-w-full overflow-hidden`}
              title={post.category}
            >
              <span className="min-w-0 truncate">{post.category}</span>
            </span>
          </span>
        ) : (
          <span className="flex-1" aria-hidden="true" />
        )}
      </div>

      {(isUpdatedSinceSaved || post?.locked) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isUpdatedSinceSaved && (
            <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
              Updated since saved
            </span>
          )}

          {post?.locked && (
            <span
              className={`${PILL_META} inline-flex items-center gap-1`}
              title={
                archivedAtLabel ? `Archived on: ${archivedAtLabel}` : "Archived"
              }
            >
              <FiLock className="text-sm" />
              <span className="truncate">
                {archivedAtLabel ? `Archived: ${archivedAtLabel}` : "Archived"}
              </span>
            </span>
          )}
        </div>
      )}

      {previewText ? (
        <p className="mt-2 text-sm text-zinc-300 line-clamp-3 min-h-[3.75rem] break-words">
          {previewText}
          {post?.content &&
          !post?.description &&
          post.content.length > CONTENT_PREVIEW_MAX
            ? "..."
            : ""}
        </p>
      ) : (
        <div className="mt-2 min-h-[3.75rem]" aria-hidden="true" />
      )}

      <div className="mt-auto pt-3 border-t border-zinc-800/60">
        <div className="min-h-[2.25rem]">
          {/* XS: 2 tags */}
          <div className="flex flex-nowrap items-center gap-2 overflow-hidden sm:hidden">
            {visibleTagsXs.map((tag, idx) => (
              <span
                key={`${tag?.text || "tag"}-${idx}`}
                className={`${PILL_TAG} shrink min-w-0 max-w-[48%] truncate`}
                title={`#${tag?.text || ""}`}
              >
                #{tag?.text || ""}
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
                key={`${tag?.text || "tag"}-${idx}`}
                className={`${PILL_TAG} shrink min-w-0 max-w-[12rem] truncate`}
                title={`#${tag?.text || ""}`}
              >
                #{tag?.text || ""}
              </span>
            ))}

            {extraTagsCountSm > 0 && (
              <span className={`${PILL_META} shrink-0`}>
                +{extraTagsCountSm}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

SavedPostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    category: PropTypes.string,
    description: PropTypes.string,
    content: PropTypes.string,
    createdAt: PropTypes.object,
    updatedAt: PropTypes.object,
    locked: PropTypes.bool,
    lockedAt: PropTypes.object,
    postUpdatedAtAtSave: PropTypes.any,
    postTitleAtSave: PropTypes.string,
    isRemoved: PropTypes.bool,
    savedAt: PropTypes.object,
    tags: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string,
      })
    ),
    author: PropTypes.shape({
      name: PropTypes.string,
      profilePicture: PropTypes.string,
      badges: PropTypes.shape({
        topContributor: PropTypes.bool,
      }),
    }),
    badges: PropTypes.shape({
      mostInspiring: PropTypes.bool,
      trending: PropTypes.bool,
    }),
  }).isRequired,
  onUnsave: PropTypes.func,
  isPendingUndo: PropTypes.bool,
};

export default SavedPostCard;
