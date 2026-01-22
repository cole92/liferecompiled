import PropTypes from "prop-types";
import { FiLock } from "react-icons/fi";

import ShieldIcon from "./ui/ShieldIcon";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { FOCUS_RING, PILL_CATEGORY, PILL_TAG, PILL_META } from "../constants/uiClasses";

function formatPostDate(post) {
  const ts = post?.updatedAt || post?.createdAt;
  if (!ts?.toDate) return "";
  return post?.updatedAt
    ? `Last edited: ${ts.toDate().toLocaleDateString()}`
    : `Posted: ${ts.toDate().toLocaleDateString()}`;
}

function getTtlPillClasses(daysLeft) {
  if (daysLeft > 20) return "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200";
  if (daysLeft > 10) return "border border-amber-500/25 bg-amber-500/10 text-amber-200";
  if (daysLeft > 0) return "border border-rose-500/25 bg-rose-500/10 text-rose-200";
  return "border border-zinc-700 bg-zinc-950/40 text-zinc-200";
}

const PostCardTrash = ({ post, daysLeft, onRestore, onDeletePermanently }) => {
  const authorName = post?.author?.name || "Unknown";
  const authorPic = post?.author?.profilePicture || DEFAULT_PROFILE_PICTURE;

  const tags = Array.isArray(post?.tags) ? post.tags : [];
  const visibleTags = tags.slice(0, 3);
  const extraTagsCount = Math.max(0, tags.length - visibleTags.length);

  const lockedAtLabel = post?.lockedAt?.toDate?.()
    ? post.lockedAt.toDate().toLocaleDateString()
    : "";

  return (
    <article className="ui-card w-full h-full overflow-hidden p-4 shadow-sm flex flex-col">
      {/* Header: author */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <img
              src={authorPic}
              alt={`Avatar of ${authorName}`}
              className={`w-10 h-10 rounded-full object-cover border border-zinc-800 ${
                post?.author?.badges?.topContributor ? "ring-2 ring-sky-400/40" : ""
              }`}
              loading="lazy"
            />
            {post?.author?.badges?.topContributor && (
              <span className="absolute -top-2 -right-2" title="Top Contributor">
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

        {/* Optional: locked indicator (trash-specific) */}
        {post?.locked && (
          <span
            className={`${PILL_META} inline-flex items-center gap-1`}
            title={lockedAtLabel ? `Locked on: ${lockedAtLabel}` : "Locked"}
          >
            <FiLock className="text-sm" />
            <span className="truncate">
              {lockedAtLabel ? `Locked: ${lockedAtLabel}` : "Locked"}
            </span>
          </span>
        )}
      </div>

      {/* Title */}
      <div className="mt-3">
        <h2 className="text-lg font-semibold leading-snug text-zinc-100 line-clamp-2 min-h-[3.25rem]">
          {post?.title || "Untitled"}
        </h2>
      </div>

      {/* Meta + category */}
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-400">
        <span className="min-w-0 line-clamp-1">{formatPostDate(post)}</span>

        {post?.category ? (
          <span className={`shrink-0 ${PILL_CATEGORY} max-w-[12rem] truncate`}>
            {post.category}
          </span>
        ) : (
          <span className="shrink-0" aria-hidden="true" />
        )}
      </div>

      {/* TTL pill */}
      {typeof daysLeft === "number" && (
        <div className="mt-2">
          <span
            className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTtlPillClasses(
              daysLeft
            )}`}
          >
            ⏳{" "}
            {daysLeft === 0
              ? "Last chance to restore!"
              : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left to restore`}
          </span>
        </div>
      )}

      {/* Description preview */}
      {post?.description ? (
        <p className="mt-2 text-sm text-zinc-300 line-clamp-3 min-h-[3.75rem] break-words">
          {post.description}
        </p>
      ) : (
        <div className="mt-2 min-h-[3.75rem]" aria-hidden="true" />
      )}

      {/* Bottom: tags */}
      <div className="mt-auto pt-3 border-t border-zinc-800/60">
        <div className="min-h-[2.25rem] flex flex-wrap items-center gap-2">
          {visibleTags.map((tag, idx) => (
            <span
              key={`${tag?.text || "tag"}-${idx}`}
              className={`${PILL_TAG} max-w-[12rem] truncate`}
              title={`#${tag?.text || ""}`}
            >
              #{tag?.text || ""}
            </span>
          ))}
          {extraTagsCount > 0 && <span className={PILL_META}>+{extraTagsCount}</span>}
        </div>

        {/* Actions strip */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onRestore}
            className={
              "rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-semibold " +
              "text-emerald-200 ring-1 ring-emerald-500/25 hover:bg-emerald-500/25 transition " +
              FOCUS_RING
            }
          >
            Restore
          </button>

          <button
            type="button"
            onClick={onDeletePermanently}
            className={
              "rounded-lg bg-rose-500/15 px-3 py-2 text-sm font-semibold " +
              "text-rose-200 ring-1 ring-rose-500/25 hover:bg-rose-500/25 transition " +
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
