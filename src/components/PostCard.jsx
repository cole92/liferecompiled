// Paketi
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
// Konfiguracija
import { auth } from "../firebase";
// Komponente
import PostReactions from "./PostReactions";
import Comments from "./comments/Comments";
// Stilovi
import "../styles/PostCard.css";


/**
 * Vizuelna kartica za prikaz blog posta.
 *
 * - Prikazuje osnovne informacije: naslov, opis, datum, autor, tagovi, kategorija
 * - Uključuje interaktivne elemente: reakcije, komentare, dugme za otvaranje celog posta
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
  isTrashMode = false,
}) => {
  const { title, description, createdAt, tags, author, category } = post;
  const navigate = useNavigate();

  const handleClick = () => {
    if (isTrashMode) return; // ako smo u Trash modu → ne radi nista
    navigate(`/post/${post.id}`);
  };

  return (
    <div
      className="post-card"
      onClick={handleClick}
      style={{
        cursor: "pointer",
        //maxHeight: "450px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Autor posta */}
      <div className="post-author">
        <img src={author.profilePicture} alt="Author" />
        <span>{author?.name || "Unknown"}</span>
      </div>
      {showDeleteButton && (
        <button
          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600
          text-white text-xs font-medium px-3 py-1 rounded shadow transition"
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

      {/* Datum */}
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

      {/* Reakcije */}
      {!isTrashMode && (
        <PostReactions postId={post.id} reactions={post.reactions} />
      )}

      {/* Kategorija */}
      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
        {category}
      </span>

      {/* Komentari */}
      {!isTrashMode && (
        <Comments postID={post.id} userId={auth.currentUser?.uid} />
      )}

      {/* View More dugme */}
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
      {/* Restore & Delete Permanently dugme */}
      {isTrashMode && (
        <div className="flex gap-2 mt-4">
          {/* Dugmad dostupna samo u Trash prikazu – za vracanje posta ili trajno brisanje */}
          <button
            onClick={onRestore}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm"
          >
            Restore
          </button>
          <button
            onClick={() => {}}
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
    id: PropTypes.string.isRequired, // Firebase ID posta
    category: PropTypes.string.isRequired, // Kategrija
    title: PropTypes.string.isRequired, // Naslov posta
    description: PropTypes.string.isRequired, // Opis posta
    createdAt: PropTypes.object.isRequired, // Firestore Timestamp
    tags: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string }))
      .isRequired, // Tagovi
    author: PropTypes.shape({
      name: PropTypes.string.isRequired, // Ime autora
      profilePicture: PropTypes.string.isRequired, // URL slike autora
    }).isRequired, // Autor je objekat i obavezno mora imati ove vrednosti
    comments: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired, // Tekst komentara
      })
    ).isRequired, // Komentari su niz objekata sa tekstom
    reactions: PropTypes.object, // Reakcije moraju biti objekat
  }).isRequired,

  showDeleteButton: PropTypes.bool,
  onDelete: PropTypes.func,
  isTrashMode: PropTypes.bool,
  onRestore: PropTypes.func,
};

export default PostCard;
