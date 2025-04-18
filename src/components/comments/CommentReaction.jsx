import PropTypes from "prop-types";
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useEffect, useState } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";

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

  // Dohvata trenutno stanje lajkova iz Firestore baze
  useEffect(() => {
    const fetchLikes = async () => {
      const ref = doc(db, "comments", commentId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();

        setLiked((data.likes || []).includes(currentUserId));
        setLikeCount((data.likes || []).length);
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

  return (
    <div>
      <button onClick={handleLike} className="flex items-center space-x-1">
        {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
        <span>{likeCount}</span>
      </button>
    </div>
  );
};

// Validacija props-a
CommentReaction.propTypes = {
  commentId: PropTypes.string.isRequired,
  currentUserId: PropTypes.string.isRequired,
};

export default CommentReaction;
