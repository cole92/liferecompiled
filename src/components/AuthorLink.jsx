import PropTypes from "prop-types";

import { Link } from "react-router-dom";

/**
 * Uviverzalni link ka autoru 
 *
 * @param {{ author: { id: string, name: string }, children?: React.ReactNode }} props
 */
const AuthorLink = ({ author, children }) => {
  if (!author?.id) return null;

  return (
    // Link ka profilu autora
    <Link
      to={`/profile/${author.id}`}
      className="text-blue-600 hover:underline"
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
};

export default AuthorLink;
