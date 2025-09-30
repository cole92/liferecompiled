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

const CONTENT_PREVIEW_MAX = 300; // limit pregleda (broj karaktera)

const SavedPostCard = ({ post, onUnsave, isPendingUndo = false }) => {
  const { user } = useContext(AuthContext);

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
  const formattedDate = lockedAt?.toDate().toLocaleDateString(); // moze biti undefined ako lockedAt ne postoji
  const navigate = useNavigate();

  const handleClick = () => {
    // Klik na karticu vodi na detalje posta
    return navigate(`/post/${post.id}`);
  };

  // Hook: proverava da li je post sacuvan od strane trenutnog korisnika
  const { isSaved, setIsSaved } = useCheckSavedStatus(user, post.id);

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    // Lokalni fallback (bez Undo): preklopi saved stanje preko util funkcije
    const newState = await toggleSavePost(user, post.id, isSaved);
    setIsSaved(newState);
  };

  return (
    <div
      onClick={handleClick}
      className={`rounded cursor-pointer
    ${
      post.badges?.trending
        ? "ring-2 ring-red-500 ring-offset-2 ring-offset-white"
        : "ring ring-gray-200"
    }
  `}
    >
      <div
        className={`border rounded shadow bg-white text-black
    ${locked ? "opacity-80 grayscale hover:opacity-100 transition" : ""}
  `}
      >
        {/* Header
           Autor sekcija: ring istice topContributor bedz;
           stopPropagation sprecava navigaciju pri kliku na bedzeve/ikonice */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative inline-block">
              <img
                src={profilePicture}
                alt={`Avatar of ${name}`}
                className={`w-10 h-10 rounded-full ${
                  author.badges?.topContributor ? "ring-2 ring-purple-800" : ""
                }`}
              />

              {author.badges?.topContributor && (
                <div
                  title="Top Contributor · Code-powered"
                  className="group relative"
                  onClick={(e) => {
                    // Interakcija sa bedzom ne treba da pokrene navigaciju
                    e.stopPropagation();
                  }}
                >
                  <ShieldIcon className="w-5 h-5 absolute -top-12 -right-2 group-hover:scale-110 transition-transform" />
                </div>
              )}
            </div>

            {/* Bedzevi (read-only): informativne oznake u Saved kontekstu */}
            <div
              className="flex gap-1 items-center hover:scale-105"
              onClick={(e) => {
                // Spreci navigaciju pri kliku na bedzeve
                e.stopPropagation();
              }}
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

            {/* Bookmark:
               - Ako parent da onUnsave → koristimo njegov Undo (deterministican prozor).
               - U suprotnom lokalni toggle (bez Undo).
               - Tokom pending Undo, dugme je onemoguceno da izbegnemo dvoklik trku. */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (isPendingUndo) return;
                if (onUnsave) {
                  onUnsave(post);
                } else {
                  handleSaveToggle(e);
                }
              }}
              className={`hover:scale-110 transition ${
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
                <BsBookmarkFill className="text-slate-950" />
              ) : (
                <BsBookmark className="text-gray-400" />
              )}
            </div>

            {/* Autor + datum (edited vs posted) */}
            <div>
              <p className="text-sm font-semibold text-gray-800">{name}</p>
              <p className="text-xs text-gray-500">
                {updatedAt
                  ? `Edited: ${updatedAt.toDate().toLocaleDateString()}`
                  : `Posted: ${createdAt.toDate().toLocaleDateString()}`}
              </p>
            </div>
          </div>

          {/* Locked: vizuelna oznaka + tooltip; ispod komentari su read-only */}
          {locked && (
            <span
              className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
              title="This post is locked and cannot be edited or commented"
            >
              <FiLock className="text-sm" />
              Locked on: {formattedDate}
            </span>
          )}
        </div>

        {/* Naslov */}
        <h2 className="text-xl font-bold mb-2">{title}</h2>

        {/* Opis */}
        {description && (
          <p className="text-sm text-gray-700 mb-2">{description}</p>
        )}

        {/* Sadrzaj (preview)
           Prikaz prvih CONTENT_PREVIEW_MAX karaktera; cuva razmake/linije preko 'whitespace-pre-line' */}
        {content && (
          <p className="text-sm text-gray-800 mb-3 whitespace-pre-line">
            {content.slice(0, CONTENT_PREVIEW_MAX)}
            {content.length > CONTENT_PREVIEW_MAX && "..."}
          </p>
        )}

        {/* Kategorija + tagovi */}
        <div className="flex flex-wrap items-center gap-2 mt-3 mb-2">
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            {category}
          </span>

          {(tags || []).map((tag, i) => (
            <span
              key={i}
              className="bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded"
            >
              #{tag.text}
            </span>
          ))}
        </div>

        {/* Komentari – read-only preview (prva N preko showAll=false)
           Sakrij formu (locked=true) i iskljuci badge modal radi kompaktnosti */}
        <div className="mt-4">
          <Comments
            postID={id}
            userId={user?.uid}
            showAll={false}
            locked={true} // sakriva formu
            disableBadgeModal={true}
          />
        </div>
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
    createdAt: PropTypes.object, // Firestore Timestamp
    updatedAt: PropTypes.object,
    locked: PropTypes.bool,
    lockedAt: PropTypes.object, // Firestore Timestamp (pretpostavka kada je locked === true)
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
  onUnsave: PropTypes.func, // parent Undo flow (opciono)
  isPendingUndo: PropTypes.bool, // onemoguci bookmark tokom pending Undo
};

export default SavedPostCard;
