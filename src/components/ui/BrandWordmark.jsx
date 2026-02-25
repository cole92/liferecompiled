import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";
import { BRAND } from "../../constants/brand";

/**
 * Normalize tagline format for consistent visual rendering.
 *
 * - Trims input and removes empty values
 * - Replaces common separators (•, middle dot) with "-"
 * - Collapses spaces/dashes into a single separator
 * - Renders first word + bullet + remaining text (compact brand style)
 *
 * Example:
 * "Code - Powered" → "Code•Powered"
 *
 * @param {string} raw - Raw tagline string
 * @returns {string} Formatted tagline
 */
function formatTagline(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const parts = s
    // Normalize bullet-like separators to dash
    .replace(/[•\u00B7]/g, "-")
    // Split by dash or whitespace
    .split(/[-\s]+/)
    .filter(Boolean);

  if (parts.length <= 1) return parts.join("");

  // First word + bullet + remaining text (no extra spaces)
  return `${parts[0]}\u2022${parts.slice(1).join("")}`;
}

/**
 * @component BrandWordmark
 *
 * Clickable brand wordmark used in navigation (e.g. header).
 *
 * - Splits brand name into plain + accent segments (from BRAND config)
 * - Applies gradient styling to accent part
 * - Optionally renders compact formatted tagline below the wordmark
 * - Fully accessible via aria-label and keyboard focus styles
 *
 * @param {string} [to="/"] - Navigation target
 * @param {string} [ariaLabel] - Accessible label for screen readers
 * @param {string} [className] - Additional wrapper classes
 * @param {string} [tagline] - Raw tagline text (formatted internally)
 * @returns {JSX.Element}
 */
export default function BrandWordmark({
  to = "/",
  ariaLabel = BRAND.homeAriaLabel,
  className = "",
  tagline = BRAND.tagline,
}) {
  // Ensure consistent visual formatting of tagline
  const taglineText = formatTagline(tagline);

  return (
    <NavLink
      to={to}
      className={
        "flex flex-col items-start text-zinc-100 no-underline select-none leading-[1] " +
        "rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
        "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 " +
        className
      }
      aria-label={ariaLabel}
      title={BRAND.name}
    >
      <span className="text-[13px] sm:text-[14px] font-semibold tracking-tight whitespace-nowrap">
        {BRAND.wordmark.plain}
        <span className="bg-gradient-to-r from-sky-200 via-blue-200 to-emerald-200 bg-clip-text text-transparent">
          {BRAND.wordmark.accent}
        </span>
      </span>

      {taglineText ? (
        <span className="mt-0.5 text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-zinc-400 whitespace-nowrap">
          {taglineText}
        </span>
      ) : null}
    </NavLink>
  );
}

BrandWordmark.propTypes = {
  to: PropTypes.string,
  ariaLabel: PropTypes.string,
  className: PropTypes.string,
  tagline: PropTypes.string,
};
