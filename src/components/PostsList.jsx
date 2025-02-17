import PropTypes from "prop-types";

import PostCard from "./PostCard";

const PostsList = ({ posts }) => {
  if (!posts || posts.length === 0) {
    return <p>No posts yet</p>;
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

PostsList.propTypes = {
    posts: PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        createdAt: PropTypes.object.isRequired, // Timestamp
        tags: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string })).isRequired,
      })
    ).isRequired,
  };
  

export default PostsList;
