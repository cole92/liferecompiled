import PropTypes from "prop-types";

/**
 * @component NoResultsMessage
 *
 * Context-aware empty state message for post listings.
 *
 * - Distinguishes between "no data in database" and "no results for filters/search"
 * - Prioritizes combined search + filter state over individual conditions
 * - Returns null when posts exist (no empty state needed)
 *
 * Behavior order (top → bottom):
 * 1. No posts in database (initial/empty app state)
 * 2. Search + filters active but no match
 * 3. Search only, no match
 * 4. Filters only, no match
 *
 * @param {Array} posts - Filtered posts array (already processed by parent)
 * @param {string} [searchTerm] - Active search query
 * @param {string[]} [selectedCategories] - Active category filters
 * @returns {JSX.Element|null}
 */
const NoResultsMessage = ({ posts, searchTerm, selectedCategories }) => {
  // Case 1: No posts exist in the database (fresh app or all deleted)
  if (
    !posts ||
    (Array.isArray(posts) &&
      posts.length === 0 &&
      searchTerm === "" &&
      selectedCategories.length === 0)
  ) {
    return (
      <p className="no-posts-message">
        There are no posts yet. Be the first to create one!
      </p>
    );
  }

  // Case 2: Search + filters active but no results
  if (
    searchTerm.trim() !== "" &&
    selectedCategories.length > 0 &&
    posts.length === 0
  ) {
    return (
      <p className="no-posts-message">
        No results for this search and filters. Try something else!
      </p>
    );
  }

  // Case 3: Search only, no results
  if (searchTerm.trim() !== "" && posts.length === 0) {
    return (
      <p className="no-posts-message">
        No search results. Try a different keyword.
      </p>
    );
  }

  // Case 4: Filters only, no results
  if (selectedCategories.length > 0 && posts.length === 0) {
    return (
      <p className="no-posts-message">
        There are no posts in the selected categories. Maybe you want to expand
        the filters?
      </p>
    );
  }

  // Default: posts exist → no empty state rendered
  return null;
};

NoResultsMessage.propTypes = {
  posts: PropTypes.array.isRequired,
  searchTerm: PropTypes.string,
  selectedCategories: PropTypes.arrayOf(PropTypes.string),
};

export default NoResultsMessage;
