import PropTypes from "prop-types";
import { useEffect } from "react";

/**
 * @component ReactionInfoModal
 * Modalni prozor koji prikazuje znacenje svakog tipa reakcije (💡, 🔥, ⚡).
 * Sluzi kao UX edukativni fallback za mobilne uredjaje gde tooltip nije pouzdan.
 * Zatvara se klikom na dugme ili pritiskom ESC tastera.
 *
 * @param {Function} onClose - Callback koji zatvara modal.
 *
 * @returns {JSX.Element} Modal sa objasnjenjem reakcija i dugmetom za zatvaranje.
 */

const ReactionInfoModal = ({ onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
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
      </div>
    </div>
  );
};

ReactionInfoModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ReactionInfoModal;
