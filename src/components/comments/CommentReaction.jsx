  import PropTypes from "prop-types";
  import {
    arrayRemove,
    arrayUnion,
    doc,
    getDoc,
    updateDoc,
  } from "firebase/firestore";
  import { getUserById } from "../../services/userService";
  import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";
  import { db } from "../../firebase";
  import { useEffect, useState } from "react";
  import { FaHeart, FaRegHeart, FaRegEye } from "react-icons/fa";

  /**
   * Komponenta za prikaz i upravljanje lajkovima na komentaru.
   *
   * Omogucava korisniku da lajkuje ili ukloni lajk sa komentara.
   * Sinhronizuje broj lajkova i trenutno stanje iz Firestore baze.
   *
   * @component
   * @param {string} commentId - ID komentara nad kojim se vrsi akcija lajkovanja.
   * @param {string} currentUserId - ID trenutno prijavljenog korisnika.
   */

  const CommentReaction = ({ commentId, currentUserId }) => {
    const [liked, setLiked] = useState(false); // State koji prati da li je korisnik lajkovao komentar
    const [likeCount, setLikeCount] = useState(0); // State koji cuva ukupan broj lajkova komentara
    const [likeList, setLikeList] = useState([]);
    const [showLikesModal, setShowLikesModal] = useState(false);
    const [likedUsers, setLikedUsers] = useState([]);

    // Dohvata trenutno stanje lajkova iz Firestore baze
    useEffect(() => {
      const fetchLikes = async () => {
        const ref = doc(db, "comments", commentId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          const likesArray = data.likes || [];

          setLiked((data.likes || []).includes(currentUserId));
          setLikeCount((data.likes || []).length);
          setLikeList(likesArray);
        }
      };
      fetchLikes();
    }, [commentId, currentUserId]);

    // Obradjuje klik na dugme za lajkovanje ili uklanjanje lajka
    const handleLike = async () => {
      const ref = doc(db, "comments", commentId);

      if (liked) {
        await updateDoc(ref, { likes: arrayRemove(currentUserId) });
        setLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        await updateDoc(ref, { likes: arrayUnion(currentUserId) });
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    };
    // Otvara modal i dohvatа sve korisnike koji su lajkovali komentar
    const handleOpenLikesModal = async () => {
      try {
        const users = await Promise.all(likeList.map((uid) => getUserById(uid)));
        setLikedUsers(users);
        setShowLikesModal(true);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };

    return (
      <div>
        <div className="flex items-center space-x-2">
          <button onClick={handleLike} className="flex items-center space-x-1">
            {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
            <span>{likeCount}</span>
          </button>
          <button onClick={handleOpenLikesModal} title="Show who liked">
            <FaRegEye />
          </button>
        </div>

        {showLikesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg w-full max-w-md text-center">
              {/* Lista korisnika koji su lajkovali komentar */}
              <ul className="text-left text-sm">
                {likedUsers.map((user, index) => (
                  <li
                    key={index}
                    className="flex items-center p-3 hover:bg-gray-100"
                  >
                    <img
                      src={user.profilePicture || DEFAULT_PROFILE_PICTURE}
                      alt={`Profile picture of ${user.name}`}
                      className="w-10 h-10 rounded-full object-cover mr-2"
                    />
                    <span className="text-sm text-gray-800 font-medium">
                      {user.name}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowLikesModal(false)}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Validacija props-a
  CommentReaction.propTypes = {
    commentId: PropTypes.string.isRequired,
    currentUserId: PropTypes.string.isRequired,
  };

  export default CommentReaction;
