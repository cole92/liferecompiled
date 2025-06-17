import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import { auth } from "../firebase";

import PostReactions from "./PostReactions";
import Comments from "./comments/Comments";

import { FiLock } from "react-icons/fi";

import "../styles/PostCard.css";

/**
 * Vizuelna kartica za prikaz blog posta.
 *
 * - Prikazuje osnovne informacije: naslov, opis, autor, datum, tagovi, kategorija
 * - Omogucava interakcije sa postom: reakcije, komentari, zakljucavanje, edit, otvaranje detaljnog prikaza
 * - Prilagodjava se kontekstu prikaza: regularni prikaz ili Trash mod
 *
 * @component
 * @param {Object} post - Objekat koji sadrzi sve informacije o postu
 * @param {boolean} [showDeleteButton=false] - Da li prikazati dugme za Delete (van Trash moda)
 * @param {Function} [onDelete] - Callback za brisanje posta
 * @param {Function} [onRestore] - Callback za vracanje posta iz Trash moda
 * @param {Function} [onDeletePermanently] - Callback za trajno brisanje posta
 * @param {boolean} [isTrashMode=false] - Da li je prikaz u Trash modu
 * @param {boolean} [isMyPost=false] - Da li je post od trenutnog korisnika
 * @param {number} [daysLeft] - Broj dana pre nego sto se post automatski obrise (Trash mod)
 * @param {Function} [onLock] - Callback za zakljucavanje posta
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
  const formattedDate = post.lockedAt?.toDate().toLocaleDateString();

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

  return (
    <div
      className="post-card"
      onClick={handleClick}
      style={{
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        className={`${
          post.locked && !isTrashMode
            ? "opacity-80 grayscale hover:opacity-100 transition duration-200"
            : ""
        }`}
      >
        <div className="post-author">
          <img src={author.profilePicture} alt="Author" />
          <span>{author?.name || "Unknown"}</span>
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
          <PostReactions
            postId={post.id}
            reactions={post.reactions}
            locked={post.locked}
          />
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

        {/* View Full Post dugme (sakriva se u Trash modu) */}
        {!isTrashMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/post/${post.id}`);
            }}
            className="view-more"
            style={{ position: "absolute", bottom: "10px", right: "10px" }}
          >
            View Full Post →
          </button>
        )}
        {/* Uslovni prikaz edit dugmeta u myPosts */}
        {!isTrashMode && isMyPost && !post.locked && (
          <Link
            to={`/dashboard/edit/${post.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-block px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition"
          >
            Edit
          </Link>
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
  );
};

PostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    createdAt: PropTypes.object.isRequired,
    locked: PropTypes.bool,
    deletedAt: PropTypes.object,
    updatedAt: PropTypes.object,
    lockedAt: PropTypes.object,
    tags: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string }))
      .isRequired, // Tagovi
    author: PropTypes.shape({
      name: PropTypes.string.isRequired,
      profilePicture: PropTypes.string.isRequired,
    }).isRequired,
    comments: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
      })
    ).isRequired,
    reactions: PropTypes.object,
  }).isRequired,

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
