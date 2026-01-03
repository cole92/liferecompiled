import PropTypes from "prop-types";
import PostCard from "./PostCard"; // Renderuje pojedinacnu post karticu

/**
 * @component PostsList
 *
 * Wrapper koji renderuje mrezu PostCard kartica.
 *
 * - Ne sadrzi logiku fetch-a (cisto prezentacioni sloj)
 * - Prihvata listu postova i prosledjuje ih dalje u PostCard
 * - Podrzava razlicite rezime kroz prop-ove (MyPosts, Trash, Home feed)
 * - `showCommentsThread` omogucava granularnu kontrolu prikaza komentara
 *
 * Props:
 * - posts: niz post objekata koji su vec UI-safe (normalizovani + enriched author)
 * - isMyPost: da li je lista u kontekstu korisnikovih sopstvenih postova
 * - showDeleteButton: kontrolise prikaz Delete akcije (Dashboard/Trash)
 * - onDelete: callback koji parent definise (UI or CF onCall)
 * - onLock: callback za zakljucavanje posta (vidljivo samo autoru)
 * - showCommentsThread: da li PostCard prikazuje Comments thread (Home=off, ostalo=on)
 *
 * @returns {JSX.Element}
 */
const PostsList = ({
  posts,
  showDeleteButton = false,
  onDelete,
  isMyPost,
  onLock,
  showCommentsThread = true,
}) => {
  return (
   <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Render UI-safe postova bez dodatne logike (cisti prikaz) */}
      {posts.map((post) => (
        <PostCard
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

// PropTypes – minimalna validacija za odrzavanje UI konzistentnosti
PostsList.propTypes = {
  posts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired, // Firestore ID
      title: PropTypes.string.isRequired, // Minimalni naslov za prikaz
      description: PropTypes.string, // UI opis; fallback resen u PostCard
      createdAt: PropTypes.object, // Firestore Timestamp (vec normalizovan)
      tags: PropTypes.arrayOf(PropTypes.shape({ text: PropTypes.string })),
    })
  ).isRequired,

  showDeleteButton: PropTypes.bool,
  onDelete: PropTypes.func,
  isMyPost: PropTypes.bool,
  onLock: PropTypes.func,
  showCommentsThread: PropTypes.bool,
};

export default PostsList;
