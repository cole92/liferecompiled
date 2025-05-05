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
import Spinner from "../Spinner";

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
  const [loadingUsers, setLoadingUsers] = useState(false); //

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
      setShowLikesModal(true);
      setLoadingUsers(true);
      const users = await Promise.all(likeList.map(getUserById));
      await new Promise((resolve) => setTimeout(resolve, 500)); // Vestacko kasnjenje radi estetike! :)
      setTopLikers(users);
    } catch (err) {
      console.error("Error loading user:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Tekst za prikaz imena korisnika i dodatnih brojeva
  const otherCount = liked ? likeCount - 1 : likeCount;

  let likeText = "";

  if (liked) {
    if (otherCount === 0) {
      likeText = "You";
    } else if (otherCount === 1) {
      likeText = "You and 1 other";
    } else {
      likeText = `You and ${otherCount} others`;
    }
  } else {
    likeText =
      likeCount === 1
        ? "1 person liked this"
        : `${likeCount} people liked this`;
  }

  return (
    <div>
      {/* Glavna sekcija: lajk dugme i tekst */}
      <div className="flex items-center space-x-2">
        {/* Dugme za lajk / odlajk */}
        <button onClick={handleLike} className="flex items-center space-x-1">
          {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
        </button>
        {/* Poruka ako niko nije lajkovao */}
        {likeCount === 0 && (
          <p className="text-sm text-gray-500 italic">
            No one has liked this comment yet.
          </p>
        )}
        {/* Dugme za otvaranje modala sa imenima */}
        {likeCount > 0 && (
          <button
            onClick={handleOpenLikesModal}
            className="text-sm text-gray-700 hover:underline cursor-pointer"
            title={likeText}
          >
            {likeText}
          </button>
        )}
      </div>
      {/* Modal sa listom korisnika koji su lajkovali */}
      {showLikesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md flex flex-col items-center">
            <h3 className="text-base font-medium mb-4">
              People who liked this
            </h3>
            {/* Spinner ili lista korisnika */}
            {loadingUsers ? (
              <Spinner className="my-8" />
            ) : topLikers.length === 0 ? (
              <p className="text-gray-500 italic my-8">
                No one has liked this comment yet.
              </p>
            ) : (
              <ul className="w-full max-h-72 overflow-y-auto">
                {topLikers.map((user) => (
                  <li
                    key={user.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-md"
                  >
                    <img
                      src={user.profilePicture || DEFAULT_PROFILE_PICTURE}
                      alt={`Profile of ${user.name}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span className="text-gray-800 underline decoration-gray-400 hover:text-blue-600">
                      {user.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {/* Dugme za zatvaranje modala */}
            <button
              onClick={() => setShowLikesModal(false)}
              className="mt-6 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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
