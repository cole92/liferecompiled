import PropTypes from "prop-types";
import { Link } from "react-router-dom";

/**
 * @component AuthorLink
 *
 * Reusable navigation link to an author's profile page.
 *
 * - Renders a <Link> to `/profile/:id`
 * - Stops event propagation to prevent parent card click triggers
 * - Supports optional label override via `children`
 * - Returns null if author id is missing (defensive guard)
 *
 * @param {{ id: string, name: string }} author - Author identity object
 * @param {React.ReactNode} [children] - Optional custom link label
 * @param {string} [className] - Additional Tailwind/custom classes
 * @returns {JSX.Element|null}
 */
const AuthorLink = ({ author, children, className = "" }) => {
  // Defensive guard: do not render invalid profile links
  if (!author?.id) return null;

  const base =
    "font-semibold text-zinc-100 hover:text-zinc-100 " +
    "hover:underline underline-offset-4 decoration-zinc-500/70 " +
    "transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-md";

  return (
    <Link
      to={`/profile/${author.id}`}
      className={`${base} ${className}`}
      // Prevent navigation conflicts when used inside clickable parent cards
      onClick={(e) => e.stopPropagation()}
      aria-label={`Open profile: ${author?.name ?? "author"}`}
    >
      {children ?? author.name}
    </Link>
  );
};

AuthorLink.propTypes = {
  author: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default AuthorLink;
