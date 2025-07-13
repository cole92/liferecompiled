import PropTypes from "prop-types";
import ModalPortal from "./ModalPortal";

/**
 * @component ReactionInfoModal
 * Modalni prozor koji prikazuje znacenje svakog tipa reakcije (💡, 🔥, ⚡).
 * Sluzi kao UX edukativni fallback za mobilne uredjaje gde tooltip nije pouzdan.
 * Zatvara se klikom na dugme ili pritiskom ESC tastera.
 *
 * @param {Function} onClose - Callback koji zatvara modal.
 * @param {boolean} isOpen - Kontrolise vidljivost modala.
 * @returns {JSX.Element} Modal sa objasnjenjem reakcija i dugmetom za zatvaranje.
 */

const ReactionInfoModal = ({ onClose, isOpen }) => {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose}>
      {/* Naslov modala */}
      <h2 className="text-lg font-semibold mb-4">
        What do the reactions mean?
      </h2>
      <div className="text-sm space-y-2 mb-4">
        <div>
          <p>
            💡 <strong>Idea</strong> — This post inspired you.
          </p>
          <p className="text-gray-500 text-xs italic mt-1">
            (In future versions, highly upvoted ideas may be featured)
          </p>
        </div>

        <div>
          <p>
            🔥 <strong>Hot</strong> — This post is on fire.
          </p>
          <p className="text-gray-500 text-xs italic mt-1">
            (Will boost visibility on trending lists soon)
          </p>
        </div>

        <div>
          <p>
            ⚡ <strong>Powerup</strong> — Show support for the author.
          </p>
          <p className="text-gray-500 text-xs italic mt-1">
            (Powerups will contribute to author reputation)
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        {/* Dugme za zatvaranje modala */}
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Got it
        </button>
      </div>
    </ModalPortal>
  );
};

ReactionInfoModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ReactionInfoModal;
