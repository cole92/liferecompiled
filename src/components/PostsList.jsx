import PropTypes from "prop-types";
import PostCard from "./PostCard"; // Uvoz PostCard komponente
import "../styles/PostsList.css"; // Stilovi za listu postova

const PostsList = ({ posts }) => {
  // Ako nema postova, prikazujemo poruku umesto prazne liste
  if (!posts || posts.length === 0) {
    return <p>No posts yet</p>;
  }

  return (
    <div className="posts-list">
      {/* Mapiramo kroz niz postova i prikazujemo PostCard komponentu za svaki */}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
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
};

export default PostsList;
