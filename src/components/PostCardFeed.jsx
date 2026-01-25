import { useContext, useMemo, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { FaInfoCircle } from "react-icons/fa";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";

import { AuthContext } from "../context/AuthContext";
import ReactionSummary from "./reactions/ReactionSummary";
import ReactionInfoModal from "./modals/ReactionInfoModal";
import BadgeModal from "./modals/BadgeModal";
import Badge from "./ui/Bagde";
import AuthorLink from "./AuthorLink";
import ShieldIcon from "./ui/ShieldIcon";
import Avatar from "./common/Avatar";

import { toggleSavePost } from "../utils/savedPostUtils";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { formatPostDateLabel } from "../utils/formatDate";

import {
  FOCUS_RING,
  PILL_CATEGORY,
  PILL_TAG,
  PILL_META,
} from "../constants/uiClasses";

const CONTENT_PREVIEW_MAX = 260;

const PostCardFeed = ({ post, isSaved, onSavedChange }) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [showInfo, setShowInfo] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showTopContributorModal, setShowTopContributorModal] = useState(false);

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

  const { descText, contentPreview, isContentTruncated } = useMemo(() => {
    const normalize = (v) =>
      typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";

    const desc = normalize(post?.description);
    const content = normalize(post?.content);

    const preview = content ? content.slice(0, CONTENT_PREVIEW_MAX) : "";

    return {
      descText: desc,
      contentPreview: preview,
      isContentTruncated: content.length > CONTENT_PREVIEW_MAX,
    };
  }, [post?.description, post?.content]);

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
    onSavedChange?.(post.id, nextState);
  };

  const cardBase =
    "relative w-full h-full overflow-hidden p-5 sm:p-4 " +
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

  const cardTrending = "";

  return (
    <>
      <article
        className={`${cardBase} ${cardInteractive} ${cardTrending} ${cardLocked}`}
        onClick={handleCardClick}
      >
        {/* Header: author + actions */}
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
                  <span className="font-semibold text-sm text-zinc-100 line-clamp-1 break-words">
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
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Meta: date + category */}
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

        {/* Preview: description + content (slightly taller, but controlled) */}
        <div className="mt-2 min-h-[5.75rem]">
          {descText ? (
            <p className="text-sm text-zinc-300 line-clamp-2 break-words">
              {descText}
            </p>
          ) : (
            <div className="min-h-[2.75rem]" aria-hidden="true" />
          )}

          {contentPreview ? (
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-300/90 line-clamp-2 break-words">
              {contentPreview}
              {isContentTruncated ? "..." : ""}
            </p>
          ) : (
            <div className="mt-1 min-h-[2.75rem]" aria-hidden="true" />
          )}
        </div>

        {/* Bottom */}
        <div className="mt-auto pt-3 border-t border-zinc-800/60">
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

          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <ReactionSummary
              postId={post.id}
              locked={post?.locked}
              reactionCounts={
                post?.reactionCounts ?? { idea: 0, hot: 0, powerup: 0 }
              }
            />
          </div>
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

PostCardFeed.propTypes = {
  post: PropTypes.object.isRequired,
  isSaved: PropTypes.bool,
  onSavedChange: PropTypes.func,
};

export default memo(PostCardFeed);
