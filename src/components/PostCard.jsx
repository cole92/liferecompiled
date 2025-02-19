import PropTypes from "prop-types";
import "../styles/PostCard.css"

const PostCard = ({ post }) => {
  const { title, description, createdAt, tags, author, comments } = post;

  return (
    <div className="post-card">
      {/* Profilna slika i ime autora */}
      <div className="post-author">
        
        <img src={author.profilePicture}  alt="Author"/>
        <span>{author?.name || "Unknown"}</span>
      </div>
      

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
        

    </div>
  );
};

PostCard.propTypes = {
  post: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    createdAt: PropTypes.object.isRequired, // Firestore Timestamp
    tags: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string }))
      .isRequired,
  }).isRequired,
};

export default PostCard;
