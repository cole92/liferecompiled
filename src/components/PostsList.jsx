import PropTypes from "prop-types";
import PostCard from "./PostCard"; // Uvoz PostCard komponente
import "../styles/PostsList.css"; // Stilovi za listu postova

/**
 * @component PostsList
 * Prikazuje listu postova pomocu PostCard komponente.
 * Prima props: posts, isMyPost, showDeleteButton, onDelete i onLock.
 */

const PostsList = ({
  posts,
  showDeleteButton = false,
  onDelete,
  isMyPost,
  onLock,
}) => {
  return (
    <div className="posts-list">
      {/* Mapiramo kroz niz postova i prikazujemo PostCard komponentu za svaki */}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          isMyPost={isMyPost}
          post={post}
          showDeleteButton={showDeleteButton}
          onDelete={onDelete}
          onLock={onLock}
        />
      ))}
    </div>
  );
};
// **PropTypes validacija - osiguravamo da posts uvek ima tacnu strukturu**
PostsList.propTypes = {
  posts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired, // Firebase ID posta
      title: PropTypes.string.isRequired, // Naslov posta
      description: PropTypes.string.isRequired, // Opis posta
      createdAt: PropTypes.object.isRequired, // Firestore Timestamp
      tags: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string })) // Svaki tag mora imati `text`
        .isRequired,
    })
  ).isRequired,

  showDeleteButton: PropTypes.bool,
  onDelete: PropTypes.func,
  isMyPost: PropTypes.bool,
  onLock: PropTypes.func, // Callback za zakljucavanje posta (vidljivo samo autoru ako post nije zakljucan)

};

export default PostsList;
