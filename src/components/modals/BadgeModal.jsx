import PropTypes from "prop-types";
import ModalPortal from "./ModalPortal";

import inspiringFull from "../ui/badges/badge_inspiring.webp";
import toHotFull from "../ui/badges/badge_hot.webp";
import topContributorBadge from "../ui/badges/badge_top_contributor.webp";

/**
 * @component BadgeModal
 *
 * Simple modal that shows a large badge image + short explanation text.
 *
 * - `badgeKey` targets post badges: "mostInspiring", "trending"
 * - `authorBadge` targets author badges: "topContributor"
 * - Closing behavior (ESC / backdrop click) is handled by `ModalPortal`.
 * - `locked` is visual-only (grayscale/opacity); close is always allowed.
 *
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {string=} authorBadge
 * @param {string=} badgeKey
 * @param {boolean=} locked
 * @returns {JSX.Element}
 */
const BadgeModal = ({ isOpen, onClose, authorBadge, badgeKey, locked }) => {
  const title =
    authorBadge === "topContributor"
      ? "Top Contributor"
      : badgeKey === "mostInspiring"
        ? "Most Inspiring"
        : badgeKey === "trending"
          ? "Trending"
          : "Badge";

  const imgClass = locked
    ? "w-48 object-contain"
    : "w-48 object-contain transition hover:scale-105";

  const panelFx = locked ? "opacity-60 grayscale" : "";

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName={`${panelFx} !p-5`}
    >
      <h2 className="text-base md:text-lg font-semibold text-center mb-4 text-zinc-100">
        {title}
      </h2>

      <div className="flex flex-wrap justify-center items-center gap-6 mb-3">
        {badgeKey === "mostInspiring" && (
          <img src={inspiringFull} alt="Most Inspiring" className={imgClass} />
        )}

        {badgeKey === "trending" && (
          <img src={toHotFull} alt="Trending" className={imgClass} />
        )}

        {authorBadge === "topContributor" && (
          <img
            src={topContributorBadge}
            alt="Top Contributor"
            className={imgClass}
          />
        )}
      </div>

      <div className="text-center space-y-2 text-sm text-zinc-200">
        {badgeKey === "mostInspiring" && (
          <p>
            💡 Your post inspired the community - thoughtful reactions
            highlighted your unique perspective.
          </p>
        )}

        {badgeKey === "trending" && (
          <p>
            🔥 Your post caught fire - the community reacted quickly, making it
            one of the hottest topics.
          </p>
        )}

        {authorBadge === "topContributor" && (
          <p>
            ⚡ Your consistent contributions empower others - you have been
            recognized as a Top Contributor.
          </p>
        )}

        <p className="text-zinc-400 text-xs italic">
          Badges are awarded automatically based on community reactions.
        </p>
      </div>

      <div className="flex justify-center mt-4">
        <button type="button" onClick={onClose} className="ui-button-primary">
          Close
        </button>
      </div>
    </ModalPortal>
  );
};

BadgeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  badgeKey: PropTypes.string,
  authorBadge: PropTypes.string,
  locked: PropTypes.bool,
};

export default BadgeModal;
