import PropTypes from "prop-types";
import { Link } from "react-router-dom";

/**
 * Universal author profile link.
 *
 * Props:
 * - author: { id: string, name: string }
 * - children: optional label override
 * - className: optional extra classes
 */
const AuthorLink = ({ author, children, className = "" }) => {
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
