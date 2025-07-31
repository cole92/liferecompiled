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

import { toggleSavePost } from "../utils/savedPostUtils";

import "../styles/PostCard.css";


/**
 * @component PostCard
 * Vizuelna kartica za prikaz blog posta sa interakcijama, statusima i dodatnim UX slojevima.
 *
 * - Prikazuje naslov, opis, autora, datum, tagove, kategoriju
 * - Ukljucuje reakcije, komentare, zakljucavanje, bedzeve i modale
 * - Prilagodjava se prikazu: regularni prikaz vs Trash mod
 * - Reakcije su deaktivirane ako je post zakljucan
 * - Prikazuje klikabilne bedzeve (💡, 🔥) i edukativni modal za reakcije
 *
 * @param {Object} post - Objekat koji sadrzi informacije o postu
 * @param {boolean} [showDeleteButton=false] - Prikaz dugmeta za Delete (van Trash moda)
 * @param {Function} [onDelete] - Callback za brisanje posta
 * @param {Function} [onRestore] - Callback za vracanje posta iz Trash-a
 * @param {Function} [onDeletePermanently] - Callback za trajno brisanje posta
 * @param {boolean} [isTrashMode=false] - Da li je prikaz u Trash modu
 * @param {boolean} [isMyPost=false] - Da li post pripada trenutnom korisniku
 * @param {number} [daysLeft] - Broj dana do trajnog brisanja (Trash mod)
 * @param {Function} [onLock] - Callback za zakljucavanje posta
 *
 * @returns {JSX.Element} Komponenta kartice posta sa dodatnim UX slojevima
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
}) => {
  const {
    title,
    description,
    createdAt,
    deletedAt,
    updatedAt,
    tags,
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

  // Hook koji proverava da li je post sacuvan od strane trenutnog korisnika
  const { isSaved, setIsSaved } = useCheckSavedStatus(user, post.id);

  // Provera da li je proslo vise od 7 dana od kreiranja posta — koristi se za automatsko zakljucavanje
  const createdDate = post.createdAt?.toDate?.();
  const isAutoLocked =
    createdDate && Date.now() > createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;

  const handleClick = () => {
    if (isTrashMode) return; // Ako smo u Trash modu, kartica nije klikabilna
    navigate(`/post/${post.id}`);
  };

  // Vizuelna boja badge-a u zavisnosti od broja preostalih dana za restore
  const getBadgeColor = (daysLeft) => {
    if (daysLeft > 20) return "bg-green-100 text-green-800";
    if (daysLeft > 10) return "bg-yellow-100 text-yellow-800";
    if (daysLeft > 0) return "bg-red-100 text-red-800";
    return "bg-gray-800 text-white";
  };

  /**
   * Racuna broj dana preostao do automatskog zakljucavanja posta.
   * Koristi se za prikaz preostalog vremena za editovanje.
   * @param {Timestamp} createdAt - Vreme kreiranja posta
   * @returns {number} Broj dana do isteka roka za izmenu
   */

  const calculateDaysLeft = (createdAt) => {
    if (!createdAt?.toDate) return 0;

    const createdDate = createdAt.toDate();
    const expireDate = createdDate.getTime() + 7 * 24 * 60 * 60 * 1000;
    const timeLeft = expireDate - Date.now();

    return timeLeft > 0 ? Math.ceil(timeLeft / (1000 * 60 * 60 * 24)) : 0;
  };

  post.badges = {
    mostInspiring: true,
    trending: true,
  };
  author.badges = {
    topContributor: true, // Trenutno hardkodovanje
  };

  // Otvara modal sa PNG bedzevima za post (preventuje bubbling do PostCard)
  const handleBadgeClick = (e, badgeKey) => {
    e.stopPropagation();
    setSelectedBadge(badgeKey);
    setShowBadgeModal(true);
  };

  // Menja status sacuvanosti posta (toggle), uz feedback kroz toast
  const handleSaveToggle = async (e) => {
    e.stopPropagation();

    const newState = await toggleSavePost(user, post.id, isSaved);
    setIsSaved(newState);
  };

  return (
    <>
      <div
        className="post-card"
        onClick={handleClick}
        style={{
          cursor: "pointer",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Klikabilni PNG bedzevi (💡, 🔥) — otvaraju BadgeModal (pasivni prikaz ako je post zakljucan) */}
        <div className="absolute top-2 right-10 z-10 flex flex-col gap-1">
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
          <div className="post-author flex items-center gap-2">
            <div className="relative inline-block">
              <img
                src={author.profilePicture}
                alt="Author"
                className={`w-10 h-10 rounded-full ${
                  author.badges?.topContributor ? "ring-2 ring-purple-800" : ""
                }`}
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
                <span className="font-semibold text-sm">{author.name}</span>
              </AuthorLink>
            ) : (
              <span className="font-semibold text-sm text-gray-500">
                Unknown Author
              </span>
            )}
          </div>
          {/* Info dugme otvara ReactionInfoModal (UX fallback za mobilne uredjaje) */}
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              aria-label="Info"
            >
              <FaInfoCircle className="text-gray-400 hover:text-blue-500" />
            </button>
          </div>

          {post.locked && !isTrashMode && (
            <div className="text-sm text-gray-600 flex items-center gap-1 mb-2">
              <span
                className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                title="This post is locked and cannot be edited or commented"
              >
                <FiLock className="text-sm" />
                Locked by author on: {`${formattedDate}`}
              </span>
            </div>
          )}

          {/* Badge prikaz koji informise da je post bio zakljucan pre nego sto je obrisan (Trash mod)*/}
          {post.locked && isTrashMode && (
            <span
              className="bg-gray-300 text-gray-800 text-sm font-medium px-2 py-1 rounded-full"
              title="This post was locked before being deleted"
            >
              🔒 Locked before deletion
            </span>
          )}

          {/* Dugme za Delete ako nije u Trash modu */}
          {showDeleteButton && (
            <button
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1 rounded shadow transition"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(post.id);
              }}
            >
              Delete
            </button>
          )}

          {/* Dugme za zakljucavanje (vidljivo samo autoru ako post nije vec zakljucan*/}
          {isMyPost && post.locked === false && (
            <button
              className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1 rounded shadow transition"
              onClick={(e) => {
                e.stopPropagation();
                onLock(post.id);
              }}
            >
              Lock this post
            </button>
          )}

          {/* Naslov i opis */}
          <h2 className="post-title">{title}</h2>

          {/* Dugme za snimanje posta toggle */}
          <button
            onClick={handleSaveToggle}
            className="hover:scale-110 transition"
            title={isSaved ? "Remove from saved" : "Save this post"}
          >
            {isSaved ? (
              <BsBookmarkFill className="text-slate-950" />
            ) : (
              <BsBookmark className="text-gray-400" />
            )}
          </button>

          {/* Vraca Tailwind klase u zavisnosti od dana preostalih za restore (Trash prikaz) */}
          {isTrashMode && daysLeft !== null && (
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded w-fit ${getBadgeColor(
                daysLeft
              )}`}
            >
              ⏳{" "}
              {daysLeft === 0
                ? "Last chance to restore!"
                : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left to restore`}
            </span>
          )}
          <p className="post-description">{description}</p>

          {/* Datum kreiranja ili izmene (sakriven u trash modu) */}
          {!isTrashMode && (
            <span className="post-date">
              {updatedAt
                ? `Last edited on: ${updatedAt.toDate().toLocaleDateString()}`
                : `Posted on: ${createdAt.toDate().toLocaleDateString()}`}
            </span>
          )}
          {isTrashMode && deletedAt && (
            <span className="post-date text-xs text-gray-500">
              {updatedAt
                ? `Last edited on: ${updatedAt.toDate().toLocaleDateString()}`
                : `Posted on: ${createdAt.toDate().toLocaleDateString()}`}
            </span>
          )}
          {/* Tagovi */}
          <div className="post-tags">
            {tags.map((tag, index) => (
              <span key={index} className="post-tag">
                #{tag.text}
              </span>
            ))}
          </div>

          {/* Reakcije (sakriva se u Trash modu) */}
          {!isTrashMode && (
            <ReactionSummary postId={post.id} locked={post.locked} />
          )}

          {/* Kategorija */}
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            {category}
          </span>

          {/* Komentari (sakriva se u Trash modu) */}
          {!isTrashMode && (
            <Comments
              postID={post.id}
              userId={auth.currentUser?.uid}
              locked={post.locked}
            />
          )}

          {/* Uslovni prikaz edit dugmeta u myPosts */}
          {!isTrashMode && isMyPost && !post.locked && !isAutoLocked && (
            <>
              <Link
                to={`/dashboard/edit/${post.id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-block px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition"
              >
                Edit
              </Link>
              <p className="text-xs text-gray-500 italic mt-1 flex items-center gap-1">
                <MdLockClock className="text-blue-500" />
                {calculateDaysLeft(post.createdAt)} day
                {calculateDaysLeft(post.createdAt) !== 1 ? "s" : ""} left to
                edit this post
              </p>
            </>
          )}

          {/* Upozorenje ako je rok za izmenu istekao — prikazuje se samo autoru */}
          {isAutoLocked && isMyPost && (
            <div className="alert alert-warning mt-3">
              <strong>Note:</strong> Editing is disabled. This post was locked
              after 7 days.
            </div>
          )}

          {/* Dugmad dostupna samo u Trash prikazu */}
          {isTrashMode && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={onRestore}
                className="px-3 py-1 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 hover:scale-105 transition duration-200"
              >
                Restore
              </button>
              <button
                onClick={onDeletePermanently}
                className="px-3 py-1 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 hover:scale-105 transition duration-200"
              >
                Delete Permanently
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Uslovni prikaz informativnog modala za znacenje reakcija */}
      {showModal && (
        <ReactionInfoModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Modal koji prikazuje osvojene bedzeve za ovaj post (pasivan prikaz ako je post zakljucan) */}
      {showBadgeModal && (
        <BadgeModal
          isOpen={showBadgeModal}
          badgeKey={selectedBadge}
          locked={post.locked && !isTrashMode}
          onClose={() => setShowBadgeModal(false)}
        />
      )}

      {/* Modal koji prikazuje Top Contributor Bagde za datog korisnika (pasivan prikaz ako je post zakljucan) */}
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
    // Osnovne informacije
    id: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    createdAt: PropTypes.object.isRequired,
    updatedAt: PropTypes.object,
    deletedAt: PropTypes.object,
    lockedAt: PropTypes.object,
    locked: PropTypes.bool,
    // Tagovi
    tags: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
      })
    ).isRequired,
    // Autor
    author: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      profilePicture: PropTypes.string.isRequired,
      badges: PropTypes.shape({
        topContributor: PropTypes.bool,
      }),
    }).isRequired,
    // Komentari
    comments: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
      })
    ).isRequired,
    // Reakcije
    reactions: PropTypes.object,
    // Bedzevi posta
    badges: PropTypes.shape({
      mostInspiring: PropTypes.bool,
      trending: PropTypes.bool,
    }),
  }).isRequired,
  // Kontrolne opcije i funkcije
  showDeleteButton: PropTypes.bool,
  onDelete: PropTypes.func,
  isTrashMode: PropTypes.bool,
  isMyPost: PropTypes.bool,
  onRestore: PropTypes.func,
  onDeletePermanently: PropTypes.func,
  daysLeft: PropTypes.number,
  onLock: PropTypes.func,
};

export default PostCard;
