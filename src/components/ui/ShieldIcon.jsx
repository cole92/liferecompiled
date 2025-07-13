import PropTypes from "prop-types";

/**
 * @component ShieldIcon
 * SVG ikonica u obliku stita sa munjom u centru.
 * Koristi se kao vizuelna metafora za reputaciju, zastitu ili status.
 *
 * @param {string} [className] - Klasa za stilizaciju SVG elementa (Tailwind ili custom).
 *
 * @returns {JSX.Element} SVG element stita sa dekoracijom.
 */



const ShieldIcon = ({ className = "" }) => (
  <svg
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Oblik stita */}
    <path
      d="M32 2L6 12v16c0 17.5 11.4 33 26 36 14.6-3 26-18.5 26-36V12L32 2z"
      fill="#004d40"       // Tamnozelena
      stroke="#d4af37"     // Zlatna ivica
      strokeWidth="4"
    />

    {/* Lightning bolt u centru */}
    <path
      d="M35 18L26 36h8l-3 10 10-14h-8l2-8z"
      fill="#f1c40f"       
    />
  </svg>
);

ShieldIcon.propTypes = {
  className: PropTypes.string,
};


export default ShieldIcon;
