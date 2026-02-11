import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";
import { BRAND } from "../../constants/brand";

function formatTagline(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const parts = s
    .replace(/[•\u00B7]/g, "-")
    .split(/[-\s]+/)
    .filter(Boolean);

  if (parts.length <= 1) return parts.join("");
  return `${parts[0]}\u2022${parts.slice(1).join("")}`; // bullet
}

export default function BrandWordmark({
  to = "/",
  ariaLabel = BRAND.homeAriaLabel,
  className = "",
  tagline = BRAND.tagline,
}) {
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
