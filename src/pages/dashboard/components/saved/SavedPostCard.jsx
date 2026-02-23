import PropTypes from "prop-types";
import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";

import { AuthContext } from "../../../../context/AuthContext";
import { useCheckSavedStatus } from "../../../../hooks/useCheckSavedStatus";

import Badge from "../../../../components/ui/Bagde";
import Avatar from "../../../../components/common/Avatar";
import BadgeModal from "../../../../components/modals/BadgeModal";
import ShieldIcon from "../../../../components/ui/ShieldIcon";

import { toggleSavePost } from "../../../../utils/savedPostUtils";
import { DEFAULT_PROFILE_PICTURE } from "../../../../constants/defaults";
import { formatPostDateLabel } from "../../../../utils/formatDate";

import {
  FOCUS_RING,
  PILL_CATEGORY,
  PILL_TAG,
  PILL_META,
} from "../../../../constants/uiClasses";

const CONTENT_PREVIEW_MAX = 300;
const MAX_TAGS_IN_APP = 5;

const normalizeTagText = (t) => {
  const raw = String(t ?? "").trim();
  if (!raw) return "";
  return raw.replace(/^#+/, "").trim();
};

const SavedPostCard = ({ post, onUnsave, isPendingUndo = false }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const { isSaved, setIsSaved } = useCheckSavedStatus(user, post.id);

  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);

  // Tag rail: unique + normalized + max 5 (scroll handles overflow)
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
    if (post?.badges?.mostInspiring) {
      out.push({ key: "mostInspiring", text: "Most Inspiring" });
    }
    if (post?.badges?.trending) {
      out.push({ key: "trending", text: "Trending" });
    }
    return out.slice(0, 2);
  }, [post?.badges?.mostInspiring, post?.badges?.trending]);

  const handleCardClick = () => navigate(`/post/${post.id}`);

  const handleBadgeClick = (e, badgeKey) => {
    e.stopPropagation();
    setSelectedBadge(badgeKey);
    setShowBadgeModal(true);
  };

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

  // Ensure tag pills do NOT truncate even if PILL_TAG contains truncate/max-w/overflow-hidden
  const TAG_PILL_NO_TRUNC =
    `${PILL_TAG} ` +
    "shrink-0 whitespace-nowrap max-w-none overflow-visible text-clip";

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
            <div className="mt-2 flex flex-col items-start gap-1 text-xs text-zinc-400 sm:flex-row sm:items-center sm:gap-2">
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

  
  return (
    <>
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

        <div className="mt-2 flex items-center gap-3 min-w-0 text-xs text-zinc-400">
          <span className="min-w-0 max-w-[7.75rem] truncate whitespace-nowrap text-[11px] sm:max-w-none sm:text-xs sm:shrink-0">
            <span className="sm:hidden">
              {formatPostDateLabel(post, { compact: true })}
            </span>
            <span className="hidden sm:inline">
              {formatPostDateLabel(post, { compact: false })}
            </span>
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

       {/* Status slot (keep layout stable) */}
<div className="mt-2 min-h-[22px] flex flex-wrap items-center gap-2">
  {isUpdatedSinceSaved && (
    <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
      Updated since saved
    </span>
  )}

  {/* Archived pill removed on Saved cards (grayscale is enough). */}
  {!isUpdatedSinceSaved && <span className="sr-only"> </span>}
</div>

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
            {/* Tag rail (same as Feed/Dashboard) */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <div
                className={
                  "tag-rail flex items-center gap-2 flex-nowrap " +
                  "overflow-x-auto overflow-y-hidden overscroll-x-contain " +
                  "pb-3"
                }
              >
                {allTags.length > 0 ? (
                  allTags.map((t, idx) => (
                    <span
                      key={`${t}_${idx}`}
                      className={TAG_PILL_NO_TRUNC}
                      title={`#${t}`}
                    >
                      #{t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-600 shrink-0 whitespace-nowrap">
                    No tags
                  </span>
                )}
              </div>

              <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-zinc-950/30 to-transparent" />
            </div>
          </div>
        </div>
      </article>

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
    tags: PropTypes.array,
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
