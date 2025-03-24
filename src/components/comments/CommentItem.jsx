import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { getUserById } from "../../services/userService";
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";

/**
 * Komponenta za prikaz jednog komentara sa korisnickim informacijama.
 * Prima ID korisnika, sadrzaj komentara i timestamp.
 * Dohvata korisniccke podatke (ime i sliku) iz Firestore-a pomocu `getUserById`.
 *
 * @param {string} userId - ID korisnika koji je ostavio komentar
 * @param {string} content - Tekst komentara
 * @param {object} timestamp - Firestore timestamp (datum i vreme komentara)
 */

const CommentItem = ({ userId, content, timestamp }) => {
  const [user, setUser] = useState(null); // State za podatke korisnika

  useEffect(() => {
    // Ako nemamo userId, ne pokrecemo dohvat
    if (!userId) return;
    // Asinhrona funkcija za dohvat podataka korisnika
    const fetchUser = async () => {
      const data = await getUserById(userId); // Koristimo helper funkciju
      setUser(data); // Azuriramo state sa podacima korisnika
    };

    fetchUser(); // Poziv funkcije prilikom mountovanja komponente
  }, [userId]);  // useEffect se pokrece kad se userId promeni

  return (
    <div className="comment-item p-4 bg-white rounded-md shadow-sm mb-4">
      <div className="flex items-start gap-3">
        {/* Profilna slika korisnika */}
        <img
          src={user?.profilePicture || DEFAULT_PROFILE_PICTURE}
          alt={`Profile picture of ${user?.name}`}
          className="w-10 h-10 rounded-full object-cover"
        />

        <div>
          {/* Ime korisnika */}
          <span className="font-semibold text-sm text-gray-800 block">
          {user && user.name}
          </span>

          {/* Tekst komentara */}
          <p className="text-sm text-gray-700 mt-1">{content}</p>

          {/* Vreme postavljanja komentara */}
          <small className="text-xs text-gray-500">
            {timestamp?.toDate().toLocaleString()}
          </small>
        </div>
      </div>
    </div>
  );
};

CommentItem.propTypes = {
  userId: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  timestamp: PropTypes.object,
};

export default CommentItem;
