import PropTypes from "prop-types";
import { FiLock } from "react-icons/fi";
import { useMemo } from "react";

import ShieldIcon from "./ui/ShieldIcon";
import Avatar from "./common/Avatar";

import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { formatPostDateLabel } from "../utils/formatDate";

import {
  FOCUS_RING,
  PILL_CATEGORY,
  PILL_TAG,
  PILL_META,
} from "../constants/uiClasses";

const MAX_TAGS_IN_APP = 5;

function getTtlPillClasses(daysLeft) {
  if (daysLeft > 20)
    return "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (daysLeft > 10)
    return "border border-amber-500/25 bg-amber-500/10 text-amber-200";
  if (daysLeft > 0)
    return "border border-rose-500/25 bg-rose-500/10 text-rose-200";
  return "border border-zinc-700 bg-zinc-950/40 text-zinc-200";
}

const normalizeTagText = (t) => {
  const raw = String(t ?? "").trim();
  if (!raw) return "";
  return raw.replace(/^#+/, "").trim();
};

const PostCardTrash = ({ post, daysLeft, onRestore, onDeletePermanently }) => {
  const authorName = post?.author?.name || "Unknown";

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

  // Ensure tag pills do NOT truncate even if PILL_TAG contains truncate/max-w/overflow-hidden
  const TAG_PILL_NO_TRUNC =
    `${PILL_TAG} ` +
    "shrink-0 whitespace-nowrap max-w-none overflow-visible text-clip";

  const lockedAtLabel = post?.lockedAt?.toDate?.()
    ? post.lockedAt.toDate().toLocaleDateString()
    : "";

  const cardBase =
    "relative w-full h-full overflow-hidden p-4 " +
    "rounded-2xl border border-zinc-800/70 " +
    "bg-gradient-to-b from-sky-500/10 via-zinc-950/20 to-zinc-950/30 " +
    "ring-1 ring-sky-200/10 shadow-sm " +
    "flex flex-col transition-colors transition-shadow duration-200";

  return (
    <article className={cardBase}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <Avatar
              src={post?.author?.profilePicture || DEFAULT_PROFILE_PICTURE}
              size={40}
              zoomable
              badge={post?.author?.badges?.topContributor}
            />

            {post?.author?.badges?.topContributor && (
              <span
                className="absolute -top-2 -right-1"
                title="Top Contributor"
              >
                <ShieldIcon className="w-5 h-5 text-amber-300" />
              </span>
            )}
          </div>

          <span className="min-w-0">
            <span className="font-semibold text-sm text-zinc-100 line-clamp-1">
              {authorName}
            </span>
          </span>
        </div>

        {post?.locked && (
          <span
            className={`${PILL_META} inline-flex items-center gap-1 max-w-[45%] sm:max-w-none`}
            title={lockedAtLabel ? `Archived on: ${lockedAtLabel}` : "Archived"}
          >
            <FiLock className="text-sm shrink-0" />
            <span className="truncate">
              {lockedAtLabel ? `Archived: ${lockedAtLabel}` : "Archived"}
            </span>
          </span>
        )}
      </div>

      {/* Title */}
      <div className="mt-3">
        <h2 className="text-lg font-semibold leading-snug text-zinc-100 min-w-0 line-clamp-2 min-h-[3.25rem] break-words">
          {post?.title || "Untitled"}
        </h2>
      </div>

      {/* Meta */}
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

      {/* Description */}
      {post?.description ? (
        <p className="mt-2 text-sm text-zinc-300 line-clamp-3 min-h-[3.75rem] break-words">
          {post.description}
        </p>
      ) : (
        <div className="mt-2 min-h-[3.75rem]" aria-hidden="true" />
      )}

      {/* Bottom */}
      <div className="mt-auto pt-3 border-t border-zinc-800/60">
        <div className="min-h-[2.25rem]">
          {/* Tag rail (same as Feed/Dashboard/Saved) */}
          <div className="relative">
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

        {/* NEW divider: tags -> status/actions */}
        <div className="mt-2 border-t border-zinc-800/50" />

        {/* TTL (always left) */}
        {typeof daysLeft === "number" && (
          <div className="mt-2 flex justify-start">
            <span
              className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTtlPillClasses(
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

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onRestore}
            className={
              "rounded-lg bg-emerald-500/15 whitespace-nowrap px-3 py-1.5 " +
              "text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/25 " +
              "hover:bg-emerald-500/25 transition sm:px-3 sm:py-2 sm:text-sm " +
              FOCUS_RING
            }
          >
            Restore
          </button>

          <button
            type="button"
            onClick={onDeletePermanently}
            className={
              "rounded-lg bg-rose-500/15 whitespace-nowrap px-3 py-1.5 " +
              "text-xs font-semibold text-rose-200 ring-1 ring-rose-500/25 " +
              "hover:bg-rose-500/25 transition sm:px-3 sm:py-2 sm:text-sm " +
              FOCUS_RING
            }
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </article>
  );
};

PostCardTrash.propTypes = {
  post: PropTypes.object.isRequired,
  daysLeft: PropTypes.number,
  onRestore: PropTypes.func.isRequired,
  onDeletePermanently: PropTypes.func.isRequired,
};

export default PostCardTrash;
