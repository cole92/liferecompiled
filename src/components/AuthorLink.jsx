// src/components/AuthorLink.jsx
import { Link } from "react-router-dom";

/**
 * Universal author link.
 *
 * @param {{ author: { id: string, name: string }, children?: React.ReactNode }} props
 */
const AuthorLink = ({ author, children }) => {
  if (!author?.id) return null; // defensive guard

  return (
    <Link
      to={`/profile/${author.id}`}
      className="text-blue-600 hover:underline"
    >
      {children ?? author.name}
    </Link>
  );
};

export default AuthorLink;
