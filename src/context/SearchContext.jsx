import { createContext, useState } from "react";
import PropTypes from "prop-types";

/**
 * Global search/sort/filter context for post listings.
 *
 * Centralizes UI state shared across Home and related views, so the feed query
 * logic stays consistent even when controls live in different components.
 *
 * NOTE:
 * - Defaults match the primary feed experience (empty search, newest sort, no categories).
 * - This is UI state only; data fetching remains in the page layer/services.
 */
const SearchContext = createContext();

/**
 * @component SearchProvider
 *
 * Wraps the app (or a subtree) and exposes shared state for:
 * - Search term
 * - Sort mode
 * - Category selection
 * - A single "reset" action used by toolbars and empty states
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export const SearchProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategories, setSelectedCategories] = useState([]);

  /**
   * Reset all feed controls to their baseline defaults.
   * Keeps UX predictable when switching views or clearing filters from the UI.
   */
  const handleResetFilters = () => {
    setSearchTerm("");
    setSortBy("newest");
    setSelectedCategories([]);
  };

  return (
    <SearchContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        sortBy,
        setSortBy,
        selectedCategories,
        setSelectedCategories,
        handleResetFilters,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

SearchProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { SearchContext };
