import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { validCategories } from "../constants/postCategories";

/**
 * @component SearchAndFilterBar
 *
 * Kombinovani kontroler za:
 * - search input (lokalna kontrola + emit globalne promene)
 * - sort dropdown (sa ogranicenjima u single-category modu)
 * - category filter panel (v1: samo 1 kategorija aktivna istovremeno)
 *
 * Kljucno ponasanje:
 * - Kada je aktivna samo jedna kategorija → "oldest" sort je zakljucan
 * - Lokalna stanja (searchTerm, sortBy) se sinkronizuju sa globalnim
 * - Filter panel koristi framer-motion animacije i a11y atribute
 *
 * Lokalne granice:
 * - selectedCategories.length === 1 → single-category v1 mode
 *
 * @param {Function} onSearchChange
 * @param {Function} onSortChange
 * @param {Function} onFilterChange
 * @param {Function} onResetFilters
 * @param {string[]} selectedCategories
 * @param {"newest"|"oldest"} sortBy
 * @returns {JSX.Element}
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

  // Single-category v1 rule: tacno jedna kategorija aktivna
  const hasActiveCategory =
    Array.isArray(selectedCategories) && selectedCategories.length === 1;

  // Ako postoji aktivna kategorija → najstariji sort je zabranjen
  useEffect(() => {
    if (hasActiveCategory && localSortBy === "oldest") {
      setLocalSortBy("newest");
      onSortChange("newest");
    }
  }, [hasActiveCategory, localSortBy, onSortChange]);

  // Sinkronizacija lokalnog dropdown-a sa globalnim sortBy
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

  // Framer-motion varijante za panel
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

  // Menjanje kategorija uz v1 ogranicenje (ostale kategorije disabled)
  const handleCategoryChange = (event) => {
    const { value, checked } = event.target;
    const newCategories = checked
      ? [...selectedCategories, value]
      : selectedCategories.filter((category) => category !== value);

    onFilterChange(newCategories);
  };

  // Lokalni search → propagacija ka globalnom state-u
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    onSearchChange(value);
  };

  // Lokalni sort → sa guard-om za single-category mod
  const handleSortChange = (e) => {
    const value = e.target.value;
    if (hasActiveCategory && value === "oldest") return; // onemoguci zabranjeni izbor

    setLocalSortBy(value);
    onSortChange(value);
  };

  // Lokalni CLEAR resetuje globalne filtere + lokalni UI state
  const handleLocalClear = () => {
    onResetFilters();
    setLocalSearchTerm("");
    setLocalSortBy("newest");
  };

  return (
    <div>
      <div className="p-4">
        {/* Sticky gornja traka: Search + Sort + Filter dugme */}
        <div className="flex items-center gap-4 bg-white p-4 z-10 rounded-lg shadow-md sticky top-0">
          {showSearch && (
            <input
              type="text"
              placeholder="Search posts..."
              value={localSearchTerm}
              onChange={handleSearchChange}
              className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <select
            value={localSortBy}
            onChange={handleSortChange}
            className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            {/* Sort "oldest" se zakljucava u single-category modu */}
            <option value="oldest" disabled={hasActiveCategory}>
              Oldest First
            </option>
          </select>

          {/* Dugme za otvaranje filter panela (+ badge kada je nesto aktivno) */}
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

        {/* Slide-in filter panel (framer-motion) */}
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

                {/* UI hint za single-category ogranicenje */}
                {hasActiveCategory && (
                  <p className="mt-2 text-sm text-gray-500 italic text-center">
                    Single category mode (v1): while a category is active, other
                    categories and the &quot;Oldest&quot; sort option are
                    disabled. Clear the filter to change selection.
                  </p>
                )}
              </div>

              {/* CLEAR dugme */}
              <button
                onClick={handleLocalClear}
                className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Clear
              </button>

              {/* CLOSE dugme */}
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
