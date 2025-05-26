import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

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
}) => {
  const { title, description, createdAt, tags, author, category } = post;
  const navigate = useNavigate();

  const handleClick = () => {
    if (isTrashMode) return; // Ako smo u Trash modu, kartica nije klikabilna
    navigate(`/post/${post.id}`);
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
      <p className="post-description">{description}</p>

      {/* Datum kreiranja */}
      <span className="post-date">
        {createdAt.toDate().toLocaleDateString()}
      </span>

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

      {/* Dugmad dostupna samo u Trash prikazu */}
      {isTrashMode && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={onRestore}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm"
          >
            Restore
          </button>
          <button
            onClick={onDeletePermanently}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm"
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
  onRestore: PropTypes.func,
  onDeletePermanently: PropTypes.func,
};

export default PostCard;
