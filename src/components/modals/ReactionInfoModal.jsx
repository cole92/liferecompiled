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
    <ModalPortal isOpen={isOpen} onClose={onClose} panelClassName="!p-5">
      {/* Naslov modala */}
      <h2 className="text-base md:text-lg font-semibold mb-3 text-zinc-100">
        What do the reactions mean?
      </h2>

      {/* Reakcije */}
      <div className="text-sm space-y-4 mb-4 text-zinc-200">
        <div className="flex items-start gap-2">
          <span>💡</span>
          <div>
            <p>
              <strong>Idea</strong> — This post inspired you.
            </p>
            <p className="text-zinc-400 text-xs italic mt-1">
              Hint: share thoughtful insights — ideas inspire reactions.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <span>🔥</span>
          <div>
            <p>
              <strong>Hot</strong> — This post is on fire.
            </p>
            <p className="text-zinc-400 text-xs italic mt-1">
              Hint: timing matters — fresh, active posts rise faster.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <span>⚡</span>
          <div>
            <p>
              <strong>Powerup</strong> — Show support for the author.
            </p>
            <p className="text-zinc-400 text-xs italic mt-1">
              Hint: consistency pays off — steady posting builds reputation.
            </p>
          </div>
        </div>
      </div>

      {/* Bedzevi */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <h2 className="text-base md:text-lg font-semibold mb-3 text-zinc-100">
          Badges from reactions — how to earn them
        </h2>
        <div className="space-y-2 text-sm text-zinc-200">
          <p>
            💡 <strong>Most Inspiring (post):</strong> reaches 10x 💡 Idea
            reactions on a single post.
          </p>
          <p>
            🔥 <strong>Trending (post):</strong> collects 20x 🔥 Hot reactions
            on one post in a short period.
          </p>
          <p>
            ⚡ <strong>Top Contributor (author):</strong> totals 50x ⚡ Powerup
            reactions across all posts by the author.
          </p>
          <p className="text-zinc-400 text-xs italic mt-1">
            (Note: thresholds may evolve as the platform grows.)
          </p>
        </div>
      </div>

      {/* Dugme */}
      <div className="flex justify-end mt-4">
        <button onClick={onClose} className="ui-button-primary">
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
