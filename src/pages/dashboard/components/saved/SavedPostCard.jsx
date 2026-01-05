import PropTypes from "prop-types";
import { useContext } from "react";

import { useNavigate } from "react-router-dom";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { FiLock } from "react-icons/fi";

import { AuthContext } from "../../../../context/AuthContext";
import { useCheckSavedStatus } from "../../../../hooks/useCheckSavedStatus";

import Badge from "../../../../components/ui/Bagde";
import ShieldIcon from "../../../../components/ui/ShieldIcon";
import Comments from "../../../../components/comments/Comments";

import { toggleSavePost } from "../../../../utils/savedPostUtils";

/**
 * @component SavedPostCard
 * Prikazuje pregled sacuvanog posta u Dashboard-u korisnika.
 *
 * Namena:
 * - Read-only pregled sadrzaja i komentara (bez forme), sa isticanjem bedzeva i lock statusa.
 * - Bookmark dugme radi u 2 moda: parent Undo (onUnsave) ili lokalni toggle (fallback).
 *
 * Kljucno ponasanje:
 * - Header sa autorom i bedzevima (informativno; klikovi na oznake ne pokrecu navigaciju).
 * - Ako je prosledjen `onUnsave`, koristi se parent Undo prozor (deterministican UX);
 *   u suprotnom koristi se lokalni `toggleSavePost` (bez Undo).
 * - Locked stanje: vizuelno naglasavanje (opacity/grayscale) + tooltip; Comments u read-only modu.
 *
 * Limiti i ugovori:
 * - CONTENT_PREVIEW_MAX = 300 (karaktera) → dodaje "..." kada je content duzi.
 * - Pretpostavka: ako je `locked === true`, postoji `lockedAt`
 *   (u suprotnom formatiran datum moze biti nevalidan).
 * - Data contract (Comments): read-only preview (showAll=false), bez badge modala i bez forme.
 *
 * @param {Object} post - Podaci o sacuvanom postu.
 * @param {Function} [onUnsave] - Ako postoji, koristi se parent Undo flow umesto lokalnog toggla.
 * @param {boolean} [isPendingUndo=false] - Kada je true, bookmark je privremeno onemogucen zbog Undo prozora.
 * @returns {JSX.Element}
 */

const CONTENT_PREVIEW_MAX = 300;

const SavedPostCard = ({ post, onUnsave, isPendingUndo = false }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const { isSaved, setIsSaved } = useCheckSavedStatus(user, post.id);

  // 🔵 1) GHOST SCENARIO – post je obrisan iz /posts, ali ostao u savedPosts
  if (post.isRemoved) {
    const handleRemoveClick = (e) => {
      e.stopPropagation();

      if (isPendingUndo) return;

      if (onUnsave) {
        onUnsave(post);
      } else {
        toggleSavePost(user, post.id, true);
      }
    };

    return (
      <div className="ui-card p-5 cursor-pointer">
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">
          {post.postTitleAtSave || post.title || "Post is no longer available"}
        </h2>

        <p className="text-xs text-zinc-400 mt-1">
          Saved on: {post.savedAt?.toDate().toLocaleDateString?.() || "unknown"}
        </p>

        <p className="text-sm text-zinc-300 mt-2">
          This post was removed by its author and is no longer available.
        </p>

        <button
          type="button"
          onClick={handleRemoveClick}
          disabled={isPendingUndo}
          className="mt-3 text-sm underline text-rose-400 hover:text-rose-300 disabled:opacity-60"
        >
          Remove from saved
        </button>
      </div>
    );
  }

  // 🟢 2) NORMAL SCENARIO – post i dalje postoji u /posts
  const {
    author,
    title,
    category,
    description,
    content,
    createdAt,
    updatedAt,
    locked,
    lockedAt,
    tags,
    id,
  } = post;

  const { name, profilePicture } = author || {};
  const formattedDate = lockedAt?.toDate().toLocaleDateString();

  const handleClick = () => navigate(`/post/${post.id}`);

  const handleSaveToggle = async (e) => {
    e.stopPropagation();

    const snapshot = {
      postUpdatedAtAtSave: post.updatedAt || post.createdAt,
      postTitleAtSave: post.title,
    };

    const newState = await toggleSavePost(user, post.id, isSaved, snapshot);
    setIsSaved(newState);
  };

  const cutoff = post.postUpdatedAtAtSave;

  let isUpdatedSinceSaved = false;

  if (cutoff && (updatedAt || createdAt)) {
    const current = (updatedAt || createdAt).toMillis
      ? (updatedAt || createdAt).toMillis()
      : updatedAt || createdAt;

    const cutoffMs = cutoff.toMillis ? cutoff.toMillis() : cutoff;
    isUpdatedSinceSaved = current > cutoffMs;
  }

  const cardBase =
    "ui-card relative w-full overflow-hidden p-5 cursor-pointer transition duration-200";
  const cardTrending = post.badges?.trending ? "ring-2 ring-rose-500/40" : "";
  const cardLocked = locked
    ? "opacity-80 grayscale hover:opacity-100"
    : "hover:bg-zinc-950/20";

  return (
    <div
      onClick={handleClick}
      className={`${cardBase} ${cardTrending} ${cardLocked}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative inline-block shrink-0">
            <img
              src={profilePicture}
              alt={`Avatar of ${name}`}
              className={`w-10 h-10 rounded-full object-cover border border-zinc-800 ${
                author?.badges?.topContributor ? "ring-2 ring-sky-400/40" : ""
              }`}
            />

            {author?.badges?.topContributor && (
              <div
                title="Top Contributor · Code-powered"
                className="group relative"
                onClick={(e) => e.stopPropagation()}
              >
                <ShieldIcon className="w-5 h-5 absolute -top-2 -right-2 text-sky-200 group-hover:scale-110 transition-transform" />
              </div>
            )}
          </div>

          {/* Bedzevi (read-only) */}
          <div
            className="flex gap-2 items-center shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {post.badges?.mostInspiring && (
              <div title="This post inspired the community">
                <Badge text="Most Inspiring" />
              </div>
            )}

            {post.badges?.trending && (
              <div title="This post is on 🔥">
                <Badge text="Trending" />
              </div>
            )}
          </div>

          {/* Bookmark */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (isPendingUndo) return;
              if (onUnsave) onUnsave(post);
              else handleSaveToggle(e);
            }}
            className={`shrink-0 rounded-lg p-2 transition hover:bg-zinc-900/40 ${
              isPendingUndo ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title={
              isPendingUndo
                ? "Undo pending..."
                : isSaved
                ? "Remove from saved"
                : "Save this post"
            }
          >
            {isSaved ? (
              <BsBookmarkFill className="text-sky-200" />
            ) : (
              <BsBookmark className="text-zinc-400" />
            )}
          </div>

          {/* Autor + datum */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">
              {name}
            </p>
            <p className="text-xs text-zinc-400 truncate">
              {updatedAt
                ? `Edited: ${updatedAt.toDate().toLocaleDateString()}`
                : `Posted: ${createdAt.toDate().toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {isUpdatedSinceSaved && (
            <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              Updated since saved
            </span>
          )}

          {locked && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-200"
              title="This post is locked and cannot be edited or commented"
            >
              <FiLock className="text-sm" />
              Locked on: {formattedDate}
            </span>
          )}
        </div>
      </div>

      {/* Naslov */}
      <h2 className="text-xl font-bold text-zinc-100 mb-2">{title}</h2>

      {/* Opis */}
      {description && (
        <p className="text-sm text-zinc-300 mb-2 break-words">{description}</p>
      )}

      {/* Sadrzaj (preview) */}
      {content && (
        <p className="text-sm text-zinc-200 mb-3 whitespace-pre-line break-words">
          {content.slice(0, CONTENT_PREVIEW_MAX)}
          {content.length > CONTENT_PREVIEW_MAX && "..."}
        </p>
      )}

      {/* Kategorija + tagovi */}
      <div className="flex flex-wrap items-center gap-2 mt-3 mb-2">
        <span className="inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold text-sky-200">
          {category}
        </span>

        {(tags || []).map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/30 px-2 py-0.5 text-xs text-zinc-200"
          >
            #{tag.text}
          </span>
        ))}
      </div>

      {/* Komentari – read-only preview */}
      <div className="mt-4 border-t border-zinc-800 pt-4">
        <Comments
          postID={id}
          userId={user?.uid}
          showAll={false}
          locked={true}
          disableBadgeModal={true}
        />
      </div>
    </div>
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
