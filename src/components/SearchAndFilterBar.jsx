import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { validCategories } from "../constants/postCategories";

const SearchAndFilterBar = ({
  onSearchChange,
  onSortChange,
  onFilterChange,
  onResetFilters,
  selectedCategories,
  sortBy,
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [localSortBy, setLocalSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const hasActiveCategory =
    Array.isArray(selectedCategories) && selectedCategories.length === 1;

  // Lock sort na "newest" kada je aktivna kategorija
  useEffect(() => {
    if (hasActiveCategory && localSortBy === "oldest") {
      setLocalSortBy("newest");
      onSortChange("newest");
    }
  }, [hasActiveCategory, localSortBy, onSortChange]);

  // Sync lokalnog sort dropdown-a sa globalnim sortBy
  useEffect(() => {
    if (sortBy === "oldest" || sortBy === "newest") {
      setLocalSortBy(sortBy);
    } else {
      setLocalSortBy("newest");
    }
  }, [sortBy]);

  const toggleFilterPanel = () => {
    setIsFilterOpen((prev) => !prev);
  };

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

  const handleCategoryChange = (event) => {
    const { value, checked } = event.target;
    const newCategories = checked
      ? [...selectedCategories, value]
      : selectedCategories.filter((category) => category !== value);

    onFilterChange(newCategories);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    onSearchChange(value);
  };

  const handleSortChange = (e) => {
    const value = e.target.value;

    if (hasActiveCategory && value === "oldest") {
      return;
    }

    setLocalSortBy(value);
    onSortChange(value);
  };

  // Lokalni clear: i globalni reset i ciscenje lokalnih inputa
  const handleLocalClear = () => {
    onResetFilters();
    setLocalSearchTerm("");
    setLocalSortBy("newest");
  };

  return (
    <div>
      <div className="p-4">
        <div className="flex items-center gap-4 bg-white p-4 z-10 rounded-lg shadow-md sticky top-0">
          <input
            type="text"
            placeholder="Search posts..."
            value={localSearchTerm}
            onChange={handleSearchChange}
            className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
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
            {selectedCategories.length > 0 &&
              ` (${selectedCategories.length})`}
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
                  const isDisabled = hasActiveCategory && !isActive;

                  return (
                    <label
                      key={categoryItem}
                      className={`flex items-center space-x-2 ${
                        isDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={categoryItem}
                        checked={isActive}
                        onChange={handleCategoryChange}
                        disabled={isDisabled}
                      />
                      <span>{categoryItem}</span>
                    </label>
                  );
                })}

                {hasActiveCategory && (
                  <p className="mt-2 text-sm text-gray-500 italic text-center">
                    Single category mode (v1): while a category is active, other
                    categories and the &quot;Oldest&quot; sort option are disabled. Clear
                    the filter to change selection.
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
  onSearchChange: PropTypes.func.isRequired, // Mora biti funkcija
  onSortChange: PropTypes.func.isRequired, // Mora biti funkcija
  onFilterChange: PropTypes.func.isRequired, // Mora biti funkcija
  onResetFilters: PropTypes.func.isRequired, // Mora biti funkcija
  selectedCategories: PropTypes.arrayOf(PropTypes.string).isRequired, // Mora biti niz stringova
  sortBy: PropTypes.oneOf(["newest", "oldest"]).isRequired,
};

export default SearchAndFilterBar;
