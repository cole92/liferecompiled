import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { validCategories } from "../constants/postCategories";

/**
 * v1 rule: samo 1 kategorija aktivna
 * UX rule: klik na drugu kategoriju prebaci selekciju (nema "zakljucavanja")
 */
const SearchAndFilterBar = ({
  onSearchChange,
  onSortChange,
  onFilterChange,
  onResetFilters,
  selectedCategories,
  sortBy,
  showSearch = true,
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [localSortBy, setLocalSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveCategory =
    Array.isArray(selectedCategories) && selectedCategories.length === 1;

  // Lock oldest sort in single-category mode
  useEffect(() => {
    if (hasActiveCategory && localSortBy === "oldest") {
      setLocalSortBy("newest");
      onSortChange("newest");
    }
  }, [hasActiveCategory, localSortBy, onSortChange]);

  // Sync local sort with global
  useEffect(() => {
    if (sortBy === "oldest" || sortBy === "newest") {
      setLocalSortBy(sortBy);
    } else {
      setLocalSortBy("newest");
    }
  }, [sortBy]);

  const toggleFilterPanel = () => setIsFilterOpen((prev) => !prev);

  const filterPanelVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
    exit: {
      opacity: 0,
      x: 50,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  };

  /**
   * v1 single-category toggle:
   * - ako kliknes aktivnu -> ukloni je ([])
   * - ako kliknes neku drugu -> zameni ([value])
   */
  const handleCategoryChange = (event) => {
    const { value } = event.target;

    const isActive = selectedCategories.includes(value);

    // toggle off
    if (isActive) {
      onFilterChange([]);
      return;
    }

    // switch to new single category
    onFilterChange([value]);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    onSearchChange(value);
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    if (hasActiveCategory && value === "oldest") return;

    setLocalSortBy(value);
    onSortChange(value);
  };

  const handleLocalClear = () => {
    onResetFilters();
    setLocalSearchTerm("");
    setLocalSortBy("newest");
  };

  return (
    <div>
      <div className="p-4">
        <div className="flex items-center gap-4 bg-white p-4 z-10 rounded-lg shadow-md sticky top-0">
          {showSearch && (
            <input
              id="home-search"
              name="homeSearch"
              type="text"
              placeholder="Search posts..."
              value={localSearchTerm}
              onChange={handleSearchChange}
              autoComplete="off"
              className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <select
            id="home-sort"
            name="homeSort"
            value={localSortBy}
            onChange={handleSortChange}
            className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest" disabled={hasActiveCategory}>
              Oldest First
            </option>
          </select>

          <button
            onClick={toggleFilterPanel}
            aria-expanded={isFilterOpen}
            aria-controls="filters-panel"
            className={`p-2 rounded-lg text-white ${
              selectedCategories.length > 0 ? "bg-blue-600" : "bg-blue-500"
            }`}
          >
            Filters
            {selectedCategories.length > 0 && ` (${selectedCategories.length})`}
          </button>
        </div>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={filterPanelVariants}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 right-0 h-full w-80 bg-white shadow-lg p-4"
              role="dialog"
              id="filters-panel"
              aria-modal="true"
            >
              <h2 className="text-lg font-bold">Filter Options</h2>

              <h3 className="text-md font-semibold mt-4">Categories</h3>
              <div className="mt-2">
                {validCategories.map((categoryItem) => {
                  const isActive = selectedCategories.includes(categoryItem);

                  const checkboxId = `filter-category-${categoryItem
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`;

                  return (
                    <div
                      key={categoryItem}
                      className="flex items-center space-x-2"
                    >
                      <input
                        id={checkboxId}
                        name="categoryFilter"
                        type="checkbox"
                        value={categoryItem}
                        checked={isActive}
                        onChange={handleCategoryChange}
                      />
                      <label htmlFor={checkboxId}>{categoryItem}</label>
                    </div>
                  );
                })}

                {hasActiveCategory && (
                  <p className="mt-2 text-sm text-gray-500 italic text-center">
                    Single category mode (v1): selecting another category will
                    switch the active one. &quot;Oldest&quot; sort remains
                    disabled while a category is active.
                  </p>
                )}
              </div>

              <button
                onClick={handleLocalClear}
                className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Clear
              </button>

              <div>
                <button
                  onClick={toggleFilterPanel}
                  className="mt-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

SearchAndFilterBar.propTypes = {
  onSearchChange: PropTypes.func.isRequired,
  onSortChange: PropTypes.func.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onResetFilters: PropTypes.func.isRequired,
  selectedCategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  sortBy: PropTypes.string,
  showSearch: PropTypes.bool,
};

export default SearchAndFilterBar;
