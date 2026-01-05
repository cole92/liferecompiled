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
      <div className="ui-card p-5">
        {/* Naslov modala */}
        <h3 className="text-base font-medium mb-4 text-zinc-100">
          People who liked this
        </h3>

        {/* Loading, Empty state, ili lista korisnika */}
        {loading ? (
          <div className="my-8">
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <p className="text-zinc-400 italic my-8">
            No one has liked this comment yet.
          </p>
        ) : (
          <>
            {/* Lista korisnika */}
            <ul className="w-full max-h-72 overflow-y-auto">
              {users.slice(0, visibleCount).map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900/40 transition"
                >
                  <img
                    src={u.profilePicture || DEFAULT_PROFILE_PICTURE}
                    alt={u.name}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                  />
                  <span className="text-zinc-100">{u.name}</span>
                </li>
              ))}
            </ul>

            {/* Dugme za ucitavanje dodatnih korisnika */}
            {visibleCount < users.length && (
              <button
                onClick={onLoadMore}
                className="mt-4 text-sm text-blue-400 hover:text-blue-300 hover:underline"
              >
                Load more
              </button>
            )}
          </>
        )}

        {/* Dugme za zatvaranje modala */}
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="ui-button-primary">
            Close
          </button>
        </div>
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
