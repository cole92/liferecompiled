import PropTypes from "prop-types";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import "../styles/PostCard.css"; // Stilovi za karticu posta
import PostReactions from "./PostReactions";
import Comments from "./comments/Comments";

const PostCard = ({ post }) => {
  const { title, description, createdAt, tags, author, category } = post;
  const navigate = useNavigate();

  return (
    <div
      className="post-card"
      onClick={() => navigate(`/post/${post.id}`)}
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
      <PostReactions postId={post.id} reactions={post.reactions} />

      {/* Kategorija */}
      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
        {category}
      </span>

      {/* Komentari */}
      <Comments postID={post.id} userId={auth.currentUser?.uid} />

      {/* View More dugme */}
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
};

export default PostCard;
