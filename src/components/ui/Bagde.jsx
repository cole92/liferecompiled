import PropTypes from "prop-types";
import mostInspiringSmallBadge from "./badges/small/inspiring-small.png";
import toHotSmallBagde from "./badges/small/toHot-small.png";

/**
 * @component Badge
 * Prikazuje mini PNG bedz na osnovu prosledjenog teksta.
 * Slika se koristi kao vizuelna oznaka za post (💡, 🔥 itd.).
 *
 * @param {string} text - Tekstualni identifikator bedza (mora odgovarati kljucu u badgeImages mapi).
 * @param {Function} [onClick] - Opcioni handler za klik (npr. otvara modal).
 *
 * @returns {JSX.Element} Ikonica bedza sa hover efektom.
 */


const badgeImages = {
  "Most Inspiring": mostInspiringSmallBadge,
  "Trending": toHotSmallBagde,
};

const Badge = ({ text, onClick }) => {
  // Odabir slike bedza na osnovu text prop vrednosti
  const imgSrc = badgeImages[text];

  return (
    <span onClick={onClick} className="cursor-pointer">
      <img
        src={imgSrc}
        alt={text}
        className="h-10 w-10 object-contain transition-transform hover:scale-105"
      />
    </span>
  );
};

Badge.propTypes = {
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default Badge;
