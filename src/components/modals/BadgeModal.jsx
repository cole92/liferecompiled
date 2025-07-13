import PropTypes from "prop-types";
import ModalPortal from "./ModalPortal";

import inspiringFull from "../ui/badges/badge_inspiring.webp";
import toHotFull from "../ui/badges/badge_hot.webp";
import topContributorBadge from "../ui/badges/badge_top_contributor.webp";

/**
 * @component BadgeModal
 * Modalni prikaz PNG bedzeva koje je post (ili autor) osvojio.
 *
 * - Prikazuje uvecane PNG ikone za: 💡 Most Inspiring, 🔥 Trending, 👑 Top Contributor
 * - Automatski zatvara modal na ESC/klik van prozora (kroz ModalPortal)
 * - Koristi se kao edukativni i motivacioni sloj (UX)
 *
 * @param {boolean} isOpen - Da li je modal trenutno otvoren
 * @param {Function} onClose - Funkcija koja zatvara modal
 * @param {Object} postBadges - Objekt koji sadrzi bedzeve za konkretan post
 * @param {boolean} [postBadges.mostInspiring] - Prikazuje 💡 bedz ako je true
 * @param {boolean} [postBadges.trending] - Prikazuje 🔥 bedz ako je true
 * @param {string} [authorBadge] - Opcionalni bedz autora (npr. "topContributor")
 *
 * @returns {JSX.Element} Modal sa prikazom PNG bedzeva i dugmetom za zatvaranje
 */

const BadgeModal = ({ isOpen, onClose, postBadges, authorBadge }) => (
  <ModalPortal isOpen={isOpen} onClose={onClose}>
    {/* Vizuelni prikaz bedzeva */}
    <div className="flex flex-wrap justify-center items-center gap-6">
      {postBadges?.mostInspiring && (
        <img
          src={inspiringFull}
          alt="Most Inspiring"
          className="w-48 object-contain transition hover:scale-105"
        />
      )}
      {postBadges?.trending && (
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
  postBadges: PropTypes.shape({
    mostInspiring: PropTypes.bool,
    trending: PropTypes.bool,
  }),
  authorBadge: PropTypes.string,
};

export default BadgeModal;
