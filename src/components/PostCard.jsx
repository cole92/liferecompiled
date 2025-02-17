import PropTypes from "prop-types";


const PostCard = ({ post }) => {
  const { title, description, createdAt, tags } = post;

  return (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      <span>{createdAt.toDate().toLocaleDateString()}</span>
      <div>
        {tags.map((tag, index) => (
          <span key={index}>#{tag.text} </span>
        ))}
      </div>
    </div>
  );
};

PostCard.propTypes = {
  post: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    createdAt: PropTypes.object.isRequired, // Firestore Timestamp
    tags: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string })).isRequired,
  }).isRequired,
};

export default PostCard;
