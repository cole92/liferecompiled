import PropTypes from "prop-types";
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { getUserById } from "../../services/userService";
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";
import { db } from "../../firebase";
import { useEffect, useState } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";

/**
 * Komponenta za prikaz i upravljanje lajkovima na komentaru.
 *
 * - Real-time sync Firestore polja 'likes'
 * - Prikazuje do 3 najnovija imena; ako ima vise od 3, dodaje "and X more..."
 * - Ne prikazuje "and X more..." ako je ukupno lajka <= 3
 *
 * @component
 * @param {string} commentId - ID komentara nad kojim se vrsi akcija lajkovanja
 * @param {string} currentUserId - ID trenutno prijavljenog korisnika
 * @returns {JSX.Element} Renderovani JSX interfejs za reakcije na komentar
 */
const CommentReaction = ({ commentId, currentUserId }) => {
  const [liked, setLiked] = useState(false); // Da li je korisnik lajkovao komentar
  const [likeCount, setLikeCount] = useState(0); // Ukupan broj lajkova
  const [likeList, setLikeList] = useState([]); // Lista ID-jeva korisnika koji su lajkovali
  const [showLikesModal, setShowLikesModal] = useState(false); // Prikaz modala
  const [topLikers, setTopLikers] = useState([]); // Do 3 korisnika za prikaz

  // Real-time listener za Firestore polje 'likes'
  useEffect(() => {
    const ref = doc(db, "comments", commentId);

    const unsubscribe = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        setLiked(false);
        setLikeCount(0);
        setLikeList([]);
        setTopLikers([]);
        return;
      }

      const likesArray = snap.data().likes || [];

      setLiked(likesArray.includes(currentUserId));
      setLikeCount(likesArray.length);
      setLikeList(likesArray);

      // Ucitaj do 3 najnovija korisnika
      const idsToShow =
        likesArray.length <= 3 ? likesArray : likesArray.slice(-3);

      if (idsToShow.length > 0) {
        const users = await Promise.all(idsToShow.map(getUserById));
        setTopLikers(users);
      } else {
        setTopLikers([]);
      }
    });

    return () => unsubscribe();
  }, [commentId, currentUserId]);

  // Obrada lajka / odlajka
  const handleLike = async () => {
    const ref = doc(db, "comments", commentId);

    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
      await updateDoc(ref, { likes: arrayRemove(currentUserId) });
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      await updateDoc(ref, { likes: arrayUnion(currentUserId) });
    }
  };

  // Otvaranje modala sa svim lajkovima
  const handleOpenLikesModal = async () => {
    try {
      const users = await Promise.all(likeList.map(getUserById));
      setTopLikers(users);
      setShowLikesModal(true);
    } catch (err) {
      console.error("Greska pri ucitavanju korisnika:", err);
    }
  };

  // Tekst za prikaz imena korisnika i dodatnih brojeva
  const names = topLikers.map((u) => u.name);
  const extraCount = likeCount > 3 ? likeCount - 3 : 0;
  const likeText =
    names.join(", ") + (extraCount > 0 ? ` and ${extraCount} more...` : "");

  return (
    <div>
      <div className="flex items-center space-x-2">
        <button onClick={handleLike} className="flex items-center space-x-1">
          {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
        </button>

        {likeCount > 0 && (
          <button
            onClick={handleOpenLikesModal}
            className="text-sm text-gray-700 hover:underline cursor-pointer"
          >
            {likeText}
          </button>
        )}
      </div>

      {showLikesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-full max-w-md text-center">
            {/* Lista korisnika koji su lajkovali komentar */}
            <ul className="text-left text-sm">
              {topLikers.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center p-3 hover:bg-gray-100"
                >
                  <img
                    src={user.profilePicture || DEFAULT_PROFILE_PICTURE}
                    alt={`Profile of ${user.name}`}
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
