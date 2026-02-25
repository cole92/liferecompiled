import PropTypes from "prop-types";
import PostCard from "./PostCard";

/**
 * @component PostsList
 *
 * Generic posts grid renderer.
 *
 * - Renders a responsive grid and delegates the actual card UI to `CardComponent`
 * - Keeps list plumbing (map + shared props) in one place to reduce duplication
 * - Supports optional modes (MyPosts, delete action, comment thread visibility)
 *
 * Notes:
 * - `CardComponent` must accept the same core props as `PostCard`
 * - `gridClassName` allows screens/routes to override layout without forking logic
 *
 * @param {Object} props
 * @param {Array} props.posts - Array of post objects (must include `id`)
 * @param {boolean} [props.showDeleteButton] - Show delete action on cards
 * @param {Function} [props.onDelete] - Called with post id when delete is requested
 * @param {boolean} [props.isMyPost] - Enables author-only affordances (edit/lock)
 * @param {Function} [props.onLock] - Called with post id when lock/archive is requested
 * @param {boolean} [props.showCommentsThread] - Toggle comments thread inside cards
 * @param {string} [props.gridClassName] - Optional grid override for special layouts
 * @param {React.ElementType} [props.CardComponent] - Card renderer (defaults to `PostCard`)
 * @returns {JSX.Element}
 */
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
  // Default: 1 column -> 2 columns on md, keeps card heights aligned in a grid.
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
