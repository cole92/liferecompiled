import PropTypes from "prop-types";
import ModalPortal from "./ModalPortal";
import Spinner from "../Spinner";
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";

/**
 * @component LikesModal
 * Modalni prikaz korisnika koji su lajkovali komentar.
 *
 * - Prikazuje avatar i ime korisnika koji su lajkovali
 * - Ukljucuje loading stanje i poruku ako nema lajkova
 * - Omogucava "Load more" prikaz za duze liste
 * - Zatvara se klikom na dugme ili ESC/overlay (preko ModalPortal)
 *
 * @param {boolean} isOpen - Da li je modal prikazan
 * @param {Function} onClose - Funkcija koja zatvara modal
 * @param {Array} users - Lista korisnika koji su lajkovali
 * @param {boolean} loading - Da li su podaci u fazi ucitavanja
 * @param {number} visibleCount - Broj trenutno prikazanih korisnika
 * @param {Function} onLoadMore - Callback za prikaz dodatnih korisnika
 *
 * @returns {JSX.Element} Modal sa listom korisnika koji su lajkovali
 */

const LikesModal = ({
  isOpen,
  onClose,
  users,
  loading,
  visibleCount,
  onLoadMore,
}) => {

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      {/* Naslov modala */}
      <h3 className="text-base font-medium mb-4">People who liked this</h3>

      {/* Loading, Empty state, ili lista korisnika */}
      {loading ? (
        <Spinner className="my-8" />
      ) : users.length === 0 ? (
        <p className="text-gray-500 italic my-8">
          No one has liked this comment yet.
        </p>
      ) : (
        <>
          {/* Lista korisnika */}
          <ul className="w-full max-h-72 overflow-y-auto">
            {users.slice(0, visibleCount).map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-md"
              >
                <img
                  src={u.profilePicture || DEFAULT_PROFILE_PICTURE}
                  alt={u.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="text-gray-800">{u.name}</span>
              </li>
            ))}
          </ul>

          {/* Dugme za ucitavanje dodatnih korisnika */}
          {visibleCount < users.length && (
            <button
              onClick={onLoadMore}
              className="mt-4 text-sm text-blue-500 hover:underline"
            >
              Load more
            </button>
          )}
        </>
      )}

      {/* Dugme za zatvaranje modala */}
      <div className="flex justify-end mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Close
        </button>
      </div>
    </ModalPortal>
  );
};

LikesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  users: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  visibleCount: PropTypes.number,
  onLoadMore: PropTypes.func,
};

export default LikesModal;
