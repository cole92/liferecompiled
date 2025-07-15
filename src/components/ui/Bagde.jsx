import PropTypes from "prop-types";
import mostInspiringSmallBadge from "./badges/small/mini_inspiring.webp";
import toHotSmallBagde from "./badges/small/mini_hot.webp";

/**
 * @component Badge
 * Prikazuje mini PNG bedz na osnovu prosledjenog teksta.
 * Slika se koristi kao vizuelna oznaka za post (💡, 🔥 itd.).
 * 
 * Ako je post zakljucan (`locked: true`), hover efekti i klik interakcije su onemoguceni.
 *
 * @param {string} text - Tekstualni identifikator bedza (mora odgovarati kljucu u badgeImages mapi).
 * @param {Function} [onClick] - Opcioni handler za klik (npr. otvara modal).
 * @param {boolean} [locked] - Da li je post zakljucan; u tom slucaju badge je pasivan.
 *
 * @returns {JSX.Element} Ikonica bedza sa vizuelnim stanjem u skladu sa `locked` statusom.
 */


const badgeImages = {
  "Most Inspiring": mostInspiringSmallBadge,
  Trending: toHotSmallBagde,
};

const Badge = ({ text, onClick, locked }) => {
  // Odabir slike bedza na osnovu text prop vrednosti
  const imgSrc = badgeImages[text];

  return (
    <span
      onClick={onClick}
      className={`inline-block cursor-pointer ${
        locked ? "grayscale opacity-80" : ""
      }`}
    >
      <img
        src={imgSrc}
        alt={text}
        className={`h-10 w-10 object-contain ${
          locked ? "" : "transition-transform hover:scale-105"
        }`}
      />
    </span>
  );
};

Badge.propTypes = {
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  locked: PropTypes.bool,
};

export default Badge;
