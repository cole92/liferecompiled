import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { validCategories } from "../constants/postCategories";

/**
 * v1 rule: only 1 category active
 * UX rule: click on another category switches selection (no locking)
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

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();

    mq.addEventListener?.("change", sync) ?? mq.addListener(sync);
    return () =>
      mq.removeEventListener?.("change", sync) ?? mq.removeListener(sync);
  }, []);

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

  const closeFilters = useCallback(() => setIsFilterOpen(false), []);
  const toggleFilterPanel = () => setIsFilterOpen((prev) => !prev);

  // ESC to close + body scroll lock (UX standard for modal)
  useEffect(() => {
    if (!isFilterOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeFilters();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isFilterOpen, closeFilters]);

  /**
   * v1 single-category toggle:
   * - if you click active -> remove ([])
   * - if you click another -> replace ([value])
   */
  const handleCategoryChange = (event) => {
    const { value } = event.target;
    const isActive = selectedCategories.includes(value);

    if (isActive) {
      onFilterChange([]);
      return;
    }

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

  // Animations:
  // - Backdrop fades in/out
  // - Mobile: bottom sheet (y)
  // - Desktop: right drawer (x)
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const panelVariantsMobile = {
    hidden: { opacity: 1, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    },
    exit: {
      opacity: 1,
      y: 24,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  };

  const panelVariantsDesktop = {
    hidden: { opacity: 1, x: 24 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    },
    exit: {
      opacity: 1,
      x: 24,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  };

  const activeCount = selectedCategories?.length || 0;

  return (
    <div className="w-full">
      {/* Top bar */}
      <div className="ui-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {showSearch && (
            <div className="flex-1">
              <label htmlFor="home-search" className="sr-only">
                Search posts
              </label>
              <input
                id="home-search"
                name="homeSearch"
                type="text"
                placeholder="Search posts..."
                value={localSearchTerm}
                onChange={handleSearchChange}
                autoComplete="off"
                className="ui-input"
              />
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="sm:w-[220px]">
              <label htmlFor="home-sort" className="sr-only">
                Sort posts
              </label>
              <select
                id="home-sort"
                name="homeSort"
                value={localSortBy}
                onChange={handleSortChange}
                className="ui-input"
              >
                <option value="newest">Newest First</option>
                <option value="oldest" disabled={hasActiveCategory}>
                  Oldest First
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={toggleFilterPanel}
              aria-expanded={isFilterOpen}
              aria-controls="filters-panel"
              className="ui-button-secondary"
            >
              Filters
              {activeCount > 0 && (
                <span className="ml-1 inline-flex items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-200">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {hasActiveCategory && (
          <p className="mt-3 text-sm text-zinc-300">
            Single category mode (v1): selecting another category switches the
            active one. Oldest sort remains disabled while a category is active.
          </p>
        )}
      </div>

      {/* Overlay filter panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Backdrop */}
            <motion.button
              type="button"
              aria-label="Close filters"
              className="absolute inset-0 h-full w-full bg-black/60"
              variants={backdropVariants}
              onClick={closeFilters}
            />

            {/* Panel container */}
            <div className="absolute inset-0 flex items-end sm:items-stretch sm:justify-end">
              {/* Mobile: bottom-sheet */}
              <motion.div
                id="filters-panel"
                role="dialog"
                aria-modal="true"
                className="w-full rounded-t-2xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur sm:rounded-none sm:border-l sm:border-t-0 sm:w-[380px] sm:h-full"
                variants={isDesktop ? panelVariantsDesktop : panelVariantsMobile}

                initial="hidden"
                animate="visible"
                exit="exit"
              >


                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-zinc-100">
                    Filter Options
                  </h2>

                  <button
                    type="button"
                    className="ui-button-outline"
                    onClick={closeFilters}
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Categories
                  </h3>

                  <div className="mt-3 max-h-[55vh] overflow-auto pr-1 sm:max-h-[calc(100vh-220px)]">
                    <div className="space-y-2">
                      {validCategories.map((categoryItem) => {
                        const isActive =
                          selectedCategories.includes(categoryItem);

                        const checkboxId = `filter-category-${categoryItem
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`;

                        return (
                          <label
                            key={categoryItem}
                            htmlFor={checkboxId}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 hover:bg-zinc-900/40"
                          >
                            <input
                              id={checkboxId}
                              name="categoryFilter"
                              type="checkbox"
                              value={categoryItem}
                              checked={isActive}
                              onChange={handleCategoryChange}
                              className="h-4 w-4 accent-sky-400"
                            />
                            <span className="text-sm text-zinc-100">
                              {categoryItem}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleLocalClear}
                      className="ui-button-secondary"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={closeFilters}
                      className="ui-button-primary"
                    >
                      Apply
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-zinc-400">
                    Tip: Click outside this panel or press ESC to close.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
