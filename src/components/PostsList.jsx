import PropTypes from "prop-types";
import PostCard from "./PostCard";

const PostsList = ({
  posts,
  showDeleteButton = false,
  onDelete,
  isMyPost,
  onLock,
  showCommentsThread = true,
  gridClassName,
  CardComponent = PostCard,
}) => {
  const defaultGridClass =
    "grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 items-stretch";

  return (
    <div className={gridClassName || defaultGridClass}>
      {posts.map((post) => (
        <CardComponent
          key={post.id}
          isMyPost={isMyPost}
          post={post}
          showDeleteButton={showDeleteButton}
          onDelete={onDelete}
          onLock={onLock}
          showCommentsThread={showCommentsThread}
        />
      ))}
    </div>
  );
};

PostsList.propTypes = {
  posts: PropTypes.array.isRequired,
  showDeleteButton: PropTypes.bool,
  onDelete: PropTypes.func,
  isMyPost: PropTypes.bool,
  onLock: PropTypes.func,
  showCommentsThread: PropTypes.bool,
  gridClassName: PropTypes.string,
  CardComponent: PropTypes.elementType,
};

export default PostsList;