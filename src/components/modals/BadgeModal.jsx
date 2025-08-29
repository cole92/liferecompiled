import PropTypes from "prop-types";
import ModalPortal from "./ModalPortal";

import inspiringFull from "../ui/badges/badge_inspiring.webp";
import toHotFull from "../ui/badges/badge_hot.webp";
import topContributorBadge from "../ui/badges/badge_top_contributor.webp";

/**
 * @component BadgeModal
 *
 * Modalni prikaz PNG bedzeva za post ili autora.
 *
 * - **badgeKey** — Prikazuje bedz za post: "mostInspiring", "trending"
 * - **authorBadge** — Prikazuje bedz za autora: "topContributor"
 * - Automatski se zatvara na **ESC** ili klik van prozora (ModalPortal)
 * - Ako je `locked`, modal je pasivan (onemogucen klik i dugme za zatvaranje)
 *
 * @param {boolean} isOpen – Da li je modal trenutno otvoren
 * @param {Function} onClose – Callback za zatvaranje modala
 * @param {string} [badgeKey] – Ključ za prikaz bedza posta
 * @param {string} [authorBadge] – Ključ za prikaz bedza autora
 * @param {boolean} [locked] – Da li je prikaz u pasivnom (zakljucanom) modu
 *
 * @returns {JSX.Element}
 */

const BadgeModal = ({ isOpen, onClose, authorBadge, badgeKey, locked }) => (
  <ModalPortal isOpen={isOpen} onClose={onClose} locked={locked}>
    <div className={locked ? "opacity-60 grayscale pointer-events-none" : ""}>
      {/* Naslov */}
      <h2 className="text-base md:text-lg font-semibold text-center mb-4">
        {authorBadge === "topContributor"
          ? "Top Contributor"
          : badgeKey === "mostInspiring"
          ? "Most Inspiring"
          : badgeKey === "trending"
          ? "Trending"
          : "Badge"}
      </h2>

      <div className="flex flex-wrap justify-center items-center gap-6 mb-3">
        {badgeKey === "mostInspiring" && (
          <img
            src={inspiringFull}
            alt="Most Inspiring"
            className="w-48 object-contain transition hover:scale-105"
          />
        )}

        {badgeKey === "trending" && (
          <img
            src={toHotFull}
            alt="Trending"
            className="w-48 object-contain transition hover:scale-105"
          />
        )}

        {authorBadge === "topContributor" && (
          <img
            src={topContributorBadge}
            alt="Top Contributor"
            className="w-48 object-contain transition hover:scale-105"
          />
        )}
      </div>

      <div className="text-center space-y-2 text-sm">
        {badgeKey === "mostInspiring" && (
          <p className="text-gray-700 dark:text-gray-900">
            💡 Your post inspired the community — thoughtful reactions
            highlighted your unique perspective.
          </p>
        )}

        {badgeKey === "trending" && (
          <p className="text-gray-700 dark:text-gray-900">
            🔥 Your post caught fire — the community reacted quickly, making it
            one of the hottest topics.
          </p>
        )}

        {authorBadge === "topContributor" && (
          <p className="text-gray-700 dark:text-gray-900">
            ⚡ Your consistent contributions empower others — you have been
            recognized as a Top Contributor.
          </p>
        )}

        <p className="text-gray-500 dark:text-gray-500 text-xs italic">
          Badges are awarded automatically based on community reactions.
        </p>
      </div>

      {/* Akcije */}
      <div className="flex justify-center mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          Close
        </button>
      </div>
    </div>
  </ModalPortal>
);

BadgeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  badgeKey: PropTypes.string,
  authorBadge: PropTypes.string,
  locked: PropTypes.bool,
};

export default BadgeModal;
