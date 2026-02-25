import { useContext } from "react";
import { SearchContext } from "./SearchContext";

/**
 * Custom hook wrapper around SearchContext.
 *
 * Why:
 * - Keeps consumer code cleaner (`useSearch()` instead of `useContext(SearchContext)`).
 * - Centralizes future enhancements (e.g. runtime guard if provider is missing).
 *
 * NOTE:
 * - Must be used inside <SearchProvider>.
 *
 * @returns {{
 *   searchTerm: string,
 *   setSearchTerm: Function,
 *   sortBy: string,
 *   setSortBy: Function,
 *   selectedCategories: string[],
 *   setSelectedCategories: Function,
 *   handleResetFilters: Function
 * }}
 */
const useSearch = () => useContext(SearchContext);

export default useSearch;
