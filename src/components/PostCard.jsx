import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import { auth } from "../firebase";

import PostReactions from "./PostReactions";
import Comments from "./comments/Comments";

import "../styles/PostCard.css";

/**
 * Vizuelna kartica za prikaz blog posta.
 *
 * - Prikazuje osnovne informacije: naslov, opis, datum, autor, tagovi, kategorija
 * - Ukljucuje interaktivne elemente: reakcije, komentare, dugme za otvaranje celog posta
 * - Navigacija ka detaljnom prikazu (`/post/:id`) se aktivira klikom na karticu
 * - U Trash modu prikazuje dugmad za Restore i Delete Permanently (pasivni prikaz)
 *
 * @component
 * @param {Object} post - Objekat koji predstavlja jedan blog post
 * @returns {JSX.Element} Interaktivna kartica blog posta
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
      {/* Autor posta */}
      <div className="post-author">
        <img src={author.profilePicture} alt="Author" />
        <span>{author?.name || "Unknown"}</span>
      </div>

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
        <PostReactions postId={post.id} reactions={post.reactions} />
      )}

      {/* Kategorija */}
      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
        {category}
      </span>

      {/* Komentari (sakriva se u Trash modu) */}
      {!isTrashMode && (
        <Comments postID={post.id} userId={auth.currentUser?.uid} />
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
      {!isTrashMode && isMyPost && (
        <Link
          to={`/dashboard/edit/${post.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm text-blue-500 hover:underline ml-2"
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
  );
};

PostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    createdAt: PropTypes.object.isRequired,
    deletedAt: PropTypes.object,
     updatedAt: PropTypes.object,
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
};

export default PostCard;
