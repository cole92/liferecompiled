import PropTypes from "prop-types";
import { FiLock } from "react-icons/fi";
import { useMemo } from "react";

import { formatPostDateLabel } from "../utils/formatDate";

import {
  FOCUS_RING,
  PILL_CATEGORY,
  PILL_TAG,
  PILL_META,
} from "../constants/uiClasses";

// UX cap: keep trash cards compact and avoid noisy tag floods
const MAX_TAGS_IN_APP = 5;

/**
 * TTL pill styling for Trash restore window.
 *
 * - Green: plenty of time left
 * - Amber: mid window
 * - Rose: last days
 * - Neutral: expired/unknown edge
 *
 * @param {number} daysLeft
 * @returns {string} Tailwind class list
 */
function getTtlPillClasses(daysLeft) {
  if (daysLeft > 20)
    return "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (daysLeft > 10)
    return "border border-amber-500/25 bg-amber-500/10 text-amber-200";
  if (daysLeft > 0)
    return "border border-rose-500/25 bg-rose-500/10 text-rose-200";
  return "border border-zinc-700 bg-zinc-950/40 text-zinc-200";
}

/**
 * Normalize tag label for display.
 *
 * - Trims whitespace
 * - Strips leading '#' characters
 * - Returns empty string for invalid input
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
 * @component PostCardTrash
 *
 * Trash-only post card (read-only preview + restore window actions).
 *
 * - Not clickable (no navigation)
 * - Shows TTL restore badge (days left) and action buttons
 * - Preserves the same visual structure as feed cards (tags rail, meta row)
 * - Marks archived/locked posts as "Archived" for context
 *
 * Notes:
 * - Tags are normalized, de-duped case-insensitively, and capped for layout stability
 * - Tag rail uses horizontal scroll to handle overflow without truncation
 *
 * @param {Object} props
 * @param {Object} props.post - Post data used for rendering the card
 * @param {number} [props.daysLeft] - Days remaining in restore window
 * @param {Function} props.onRestore - Restore handler
 * @param {Function} props.onDeletePermanently - Hard delete handler
 * @returns {JSX.Element}
 */
const PostCardTrash = ({ post, daysLeft, onRestore, onDeletePermanently }) => {
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

  // IMPORTANT: ensure tag pills do NOT truncate even if PILL_TAG contains truncate/max-w/overflow-hidden
  const TAG_PILL_NO_TRUNC =
    `${PILL_TAG} ` +
    "shrink-0 whitespace-nowrap max-w-none overflow-visible text-clip";

  const cardBase =
    "relative flex h-full w-full flex-col overflow-hidden rounded-2xl " +
    "border border-zinc-800 bg-zinc-950 p-4 shadow-sm";

  return (
    <article className={cardBase}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-200">
              In Trash
            </span>

            {post?.locked && (
              <span
                className={`${PILL_META} inline-flex items-center gap-1`}
                title="Archived"
              >
                <FiLock className="shrink-0 text-sm" />
                <span>Archived</span>
              </span>
            )}
          </div>
        </div>

        {typeof daysLeft === "number" && (
          <span
            className={`inline-flex max-w-max self-start whitespace-nowrap items-center rounded-full px-2.5 py-1 text-xs font-medium ${getTtlPillClasses(
              daysLeft,
            )}`}
          >
            {daysLeft === 0
              ? "Last day to restore"
              : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`}
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

            {/* Visual fade hint (scroll affordance) */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-zinc-950/30 to-transparent" />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 grid grid-cols-1 gap-2 border-t border-zinc-800 pt-3 sm:flex sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onRestore}
            className={
              "ui-button justify-center bg-emerald-600 px-3 py-2 text-sm " +
              "font-semibold text-zinc-50 hover:bg-emerald-500 " +
              FOCUS_RING
            }
          >
            Restore post
          </button>

          <button
            type="button"
            onClick={onDeletePermanently}
            className={
              "ui-button justify-center border border-rose-500/30 bg-rose-500/10 " +
              "px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/15 " +
              FOCUS_RING
            }
          >
            Delete permanently
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
