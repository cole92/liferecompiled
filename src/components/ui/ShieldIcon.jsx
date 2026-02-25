import PropTypes from "prop-types";

/**
 * @component ShieldIcon
 *
 * Decorative SVG shield icon with a lightning bolt in the center.
 *
 * - Used as a visual metaphor for reputation, protection, or status
 * - Accepts external `className` for size and color control (Tailwind/custom)
 * - Pure presentational component (no internal state or logic)
 *
 * @param {string} [className] - Optional classes applied to the root <svg>
 * @returns {JSX.Element}
 */
const ShieldIcon = ({ className = "" }) => (
  <svg
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Shield base shape */}
    <path
      d="M32 2L6 12v16c0 17.5 11.4 33 26 36 14.6-3 26-18.5 26-36V12L32 2z"
      fill="#004d40" // Dark green base
      stroke="#d4af37" // Gold outline
      strokeWidth="4"
    />

    {/* Center lightning bolt accent */}
    <path d="M35 18L26 36h8l-3 10 10-14h-8l2-8z" fill="#f1c40f" />
  </svg>
);

ShieldIcon.propTypes = {
  className: PropTypes.string,
};

export default ShieldIcon;
