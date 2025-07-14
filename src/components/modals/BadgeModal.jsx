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
 *
 * @param {boolean} **isOpen** – Da li je modal trenutno otvoren
 * @param {Function} **onClose** – Callback za zatvaranje modala
 * @param {string} **badgeKey** – Ključ za prikaz bedza posta
 * @param {string} **authorBadge** – Ključ za prikaz bedza autora
 *
 * @returns {JSX.Element}
 */

const BadgeModal = ({ isOpen, onClose, authorBadge, badgeKey }) => (
  <ModalPortal isOpen={isOpen} onClose={onClose}>
    {/* Vizuelni prikaz bedzeva */}
    <div className="flex flex-wrap justify-center items-center gap-6">
      {badgeKey === "mostInspiring" && (
        <>
          <img
            src={inspiringFull}
            alt="Most Inspiring"
            className="w-48 object-contain transition hover:scale-105"
          />
          <p className="text-center text-sm text-gray-600 mt-2">
            💡 This post sparked thoughtful reactions and stood out for its
            message. <br />
            Trenutno kao placeholder smislicemo poruku!
          </p>
        </>
      )}

      {badgeKey === "trending" && (
        <>
          <img
            src={toHotFull}
            alt="Trending"
            className="w-48 object-contain transition hover:scale-105"
          />
          <p className="text-center text-sm text-gray-600 mt-2">
            🔥 This post quickly gained momentum, attracting attention and
            sparking engagement across the platform. <br />
            Trenutno kao placeholder smislicemo poruku!
          </p>
        </>
      )}
      {authorBadge === "topContributor" && (
        <img
          src={topContributorBadge}
          alt="Top Contributor"
          className="w-48 object-contain transition hover:scale-105"
        />
      )}
    </div>

    {/* Dugme za zatvaranje modala */}
    <div className="flex justify-end mt-6">
      <button
        onClick={onClose}
        className="px-4 py-2 bg-amber-900 text-white rounded"
      >
        Got it
      </button>
    </div>
  </ModalPortal>
);

BadgeModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  badgeKey: PropTypes.string,
  authorBadge: PropTypes.string,
};

export default BadgeModal;
