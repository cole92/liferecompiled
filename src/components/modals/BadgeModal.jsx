import PropTypes from "prop-types";
import { useEffect } from "react";

import inspiringFull from "../ui/badges/badge_inspiring.webp";
import toHotFull from "../ui/badges/badge_hot.webp";
import topContributorBadge from "../ui/badges/badge_top_contributor.webp";

/**
 * @component BadgeModal
 * Modalni prikaz bedzeva koje je post osvojio (💡 Most Inspiring, 🔥 Trending).
 * Prikazuje se uvećana PNG slika svakog aktivnog bedza.
 * Modal se zatvara klikom na dugme ili pritiskom na ESC taster.
 *
 * @param {Function} onClose - Callback funkcija za zatvaranje modala.
 * @param {Object} postBadges - Objekat sa logickim vrednostima koje bedzeve prikazati.
 * @param {boolean} [postBadges.mostInspiring] - Da li prikazati 💡 bedz.
 * @param {boolean} [postBadges.trending] - Da li prikazati 🔥 bedz.
 *
 * @returns {JSX.Element} Modal sa prikazom PNG bedzeva i zatvarajucim dugmetom.
 */

const BadgeModal = ({ onClose, postBadges, authorBadge }) => {
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
      <div className="bg-amber-100 border-[3px] border-amber-700 rounded-xl shadow-xl p-6 max-w-xl w-full ">
        {/* Prikaz bedzeva koji su aktivni za dati post */}
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
        </div>
        
        {/* Prikaz Top Contributor Badge */}
        {authorBadge === "topContributor" && (
          <img
            src={topContributorBadge}
            alt="Top Contributor"
            className="w-48 object-contain transition hover:scale-105"
          />
        )}

        <div className="flex justify-end">
          {/* Dugme za zatvaranje modala */}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-900 text-white rounded"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

BadgeModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  postBadges: PropTypes.shape({
    mostInspiring: PropTypes.bool,
    trending: PropTypes.bool,
  }),
  authorBadge: PropTypes.string,
};

export default BadgeModal;
