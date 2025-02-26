import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "../styles/PostCard.css";

const PostCard = ({ post }) => {
  const { title, description, createdAt, tags, author, comments } = post;

  const navigate = useNavigate();

  return (
    <div
      className="post-card"
      onClick={() => navigate(`/post/${post.id}`)}
      style={{ cursor: "pointer" }}
    >
      {/* Profilna slika i ime autora */}
      <div className="post-author">
        <img src={author.profilePicture} alt="Author" />
        <span>{author?.name || "Unknown"}</span>
      </div>
      
      {/* Naslov, opis i datum objave */}
      <h2 className="post-title">{title}</h2>
      <p className="post-description">{description}</p>
      <span className="post-date">
        {createdAt.toDate().toLocaleDateString()}
      </span>

      {/* Tagovi */}
      <div className="post-tags">
        {tags.map((tag, index) => (
          <span key={index} className="post-tag">
            #{tag.text}{" "}
          </span>
        ))}
      </div>
      {/* Broj komentara */}
      <p className="post-comments">{comments?.length || 0} comments</p>

      {/* Prikaz 1-2 komentara ako ih ima */}
      {comments?.slice(0, 2).map((comment, index) => (
        <p key={index} className="post-comment">
          &quot;{comment.text}
        </p>
      ))}
    </div>
  );
};

PostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired, // Firebase ID posta
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
  }).isRequired,
};

export default PostCard;
