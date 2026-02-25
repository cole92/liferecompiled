import PropTypes from "prop-types";
import mostInspiringSmallBadge from "./badges/small/mini_inspiring.webp";
import toHotSmallBagde from "./badges/small/mini_hot.webp";

// Map badge label to its corresponding image asset
// Keeps UI decoupled from hardcoded image imports in parent components
const badgeImages = {
  "Most Inspiring": mostInspiringSmallBadge,
  Trending: toHotSmallBagde,
};

/**
 * @component Badge
 *
 * Small visual badge chip (e.g. "Most Inspiring", "Trending").
 *
 * - Renders a circular glass-style frame with a badge image inside
 * - Supports optional click interaction (e.g. open modal / filter)
 * - `locked` disables interaction and applies muted visual state
 * - Designed as a compact UI atom for post cards and highlights
 *
 * @param {string} text - Badge label (must match key in `badgeImages`)
 * @param {Function} [onClick] - Optional click handler
 * @param {boolean} [locked] - Disables interaction and applies muted state
 * @param {number} [size=26] - Image size in pixels
 * @returns {JSX.Element}
 */
const Badge = ({ text, onClick, locked, size = 26 }) => {
  const imgSrc = badgeImages[text];

  // Click is allowed only if handler exists and badge is not locked
  const canClick = !!onClick && !locked;

  return (
    <button
      type="button"
      // Avoid attaching onClick when disabled (prevents accidental triggers)
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      className={[
        // Mini glass chip frame
        "inline-flex items-center justify-center",
        "rounded-full border border-zinc-800/70 bg-zinc-950/55 backdrop-blur",
        "ring-1 ring-zinc-100/5 shadow-sm",

        // Spacing
        "p-1",

        // Interaction states
        canClick
          ? "cursor-pointer hover:bg-zinc-900/45 transition"
          : "cursor-default",

        // Locked state visually muted
        locked ? "grayscale opacity-75" : "opacity-95 hover:opacity-100",

        // Accessibility focus ring
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
      ].join(" ")}
      aria-label={text}
      title={text}
    >
      <img
        src={imgSrc}
        alt="" // Decorative image (label provided via aria-label)
        width={size}
        height={size}
        className={canClick ? "transition-transform hover:scale-105" : ""}
        draggable={false}
      />
    </button>
  );
};

Badge.propTypes = {
  text: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  locked: PropTypes.bool,
  size: PropTypes.number,
};

export default Badge;
