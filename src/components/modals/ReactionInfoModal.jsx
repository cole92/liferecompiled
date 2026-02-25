import PropTypes from "prop-types";
import ModalPortal from "./ModalPortal";

/**
 * @component ReactionInfoModal
 *
 * Educational modal that explains reaction meanings (💡/🔥/⚡) + related badges.
 * Primary purpose: mobile-friendly fallback when hover tooltips are unreliable.
 *
 * Behavior:
 * - Closes via backdrop/ESC through `ModalPortal` and via explicit CTA button.
 * - Copy can mention current thresholds, but treat them as adjustable platform rules.
 *
 * @param {Function} onClose - Close handler for the modal.
 * @param {boolean} isOpen - Visibility flag.
 * @returns {JSX.Element}
 */
const ReactionInfoModal = ({ onClose, isOpen }) => {
  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} panelClassName="!p-5">
      {/* Clear title to set context immediately (no tooltip dependency). */}
      <h2 className="text-base md:text-lg font-semibold mb-3 text-zinc-100">
        What do the reactions mean?
      </h2>

      {/* Compact, scannable explanation list: icon -> label -> meaning + short hint. */}
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

      {/* Badge section: connects reactions to longer-term incentives/achievements. */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <h2 className="text-base md:text-lg font-semibold mb-3 text-zinc-100">
          Badges from reactions — how to earn them
        </h2>

        <div className="space-y-2 text-sm text-zinc-200">
          <p>
            💡 <strong>Most Inspiring (post):</strong> reaches 5x 💡 Idea
            reactions on a single post.
          </p>

          <p>
            🔥 <strong>Trending (post):</strong> collects 10x 🔥 Hot reactions
            on one post. Stays Trending for 7 days since the last 🔥 (each new
            Hot refreshes the timer).
          </p>

          <p>
            ⚡ <strong>Top Contributor (author):</strong> totals 30x ⚡ Powerup
            reactions across all posts by the author.
          </p>

          <p className="text-zinc-400 text-xs italic mt-1">
            (Note: thresholds may evolve as the platform grows.)
          </p>
        </div>
      </div>

      {/* Single CTA keeps the close action obvious on mobile. */}
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
