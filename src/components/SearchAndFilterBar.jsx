import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { validCategories } from "../constants/postCategories";
import FilterPortal from "./modals/FilterPortal";

export const FiltersPanelContent = ({
  selectedCategories,
  onFilterChange,
  onReset,
  onClose,
}) => {
  const activeCount = selectedCategories?.length || 0;

  const handleCategoryChange = (event) => {
    const { value } = event.target;
    const isActive = selectedCategories.includes(value);

    if (isActive) {
      onFilterChange([]);
      return;
    }

    onFilterChange([value]);
  };

  const handleClear = () => onReset();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-100">Filter Options</h2>
        <button type="button" className="ui-button-outline" onClick={onClose}>
          Close
        </button>
      </div>

      {/* Bitno: min-h-0 da bi unutrasnji overflow radio u flex konteineru */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <h3 className="text-sm font-semibold text-zinc-200">
          Categories{activeCount > 0 ? ` (${activeCount})` : ""}
        </h3>

        {/* Lista je jedino sto skroluje */}
        <div className="mt-3 min-h-0 flex-1 overflow-auto pr-1 ui-scrollbar">
          <div className="space-y-2">
            {validCategories.map((categoryItem) => {
              const isActive = selectedCategories.includes(categoryItem);

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
                  <span className="text-sm text-zinc-100">{categoryItem}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="ui-button-secondary"
          >
            Clear
          </button>

          <button type="button" onClick={onClose} className="ui-button-primary">
            Apply
          </button>
        </div>

        <p className="mt-3 text-xs text-zinc-400">
          Tip: Press ESC (mobile drawer) or use Close on desktop sidebar.
        </p>
      </div>
    </div>
  );
};

FiltersPanelContent.propTypes = {
  selectedCategories: PropTypes.arrayOf(PropTypes.string).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * SearchAndFilterBar
 * - < md (0-767): overlay drawer (bottom sheet on <sm, right drawer on sm+)
 * - >= md (768+): parent (Home) renders docked sidebar
 */
const SearchAndFilterBar = ({
  onSearchChange,
  onSortChange,
  onFilterChange,
  onResetFilters,
  selectedCategories,
  sortBy,
  showSearch = true,
  variant = "card",
  afterSortSlot = null,
  desktopSidebarOpen = false,
  onDesktopToggleFilters = null,
  onDesktopCloseFilters = null,
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [localSortBy, setLocalSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // sm+ controls overlay type (bottom sheet vs right drawer)
  const [isSmUp, setIsSmUp] = useState(false);
  // md+ uses docked sidebar instead of overlay
  const [isLgUp, setIsLgUp] = useState(false);

  // Custom sort dropdown UI-only state
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortWrapRef = useRef(null);

  useEffect(() => {
    const mqSm = window.matchMedia("(min-width: 640px)");
    const mqMd = window.matchMedia("(min-width: 768px)");

    const sync = () => {
      setIsSmUp(mqSm.matches);
      setIsLgUp(mqMd.matches);
    };

    sync();

    mqSm.addEventListener?.("change", sync) ?? mqSm.addListener(sync);
    mqMd.addEventListener?.("change", sync) ?? mqMd.addListener(sync);

    return () => {
      mqSm.removeEventListener?.("change", sync) ?? mqSm.removeListener(sync);
      mqMd.removeEventListener?.("change", sync) ?? mqMd.removeListener(sync);
    };
  }, []);

  // If we enter md+, ensure overlay closes
  useEffect(() => {
    if (isLgUp) setIsFilterOpen(false);
  }, [isLgUp]);

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

  const toggleFilterPanel = () => {
    // md+: sidebar is controlled by parent (Home)
    if (isLgUp && typeof onDesktopToggleFilters === "function") {
      onDesktopToggleFilters();
      return;
    }

    setIsFilterOpen((prev) => !prev);
  };

  const closeSort = useCallback(() => setIsSortOpen(false), []);
  const toggleSort = () => setIsSortOpen((prev) => !prev);

  // Close sort on ESC / click outside (UI-only)
  useEffect(() => {
    if (!isSortOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeSort();
    };

    const onMouseDown = (e) => {
      const wrap = sortWrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(e.target)) closeSort();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [isSortOpen, closeSort]);

  // ESC to close overlay + body scroll lock (only for overlay drawer)
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

  // Docked sidebar: ESC closes sidebar if provided
  useEffect(() => {
    if (!isLgUp || !desktopSidebarOpen) return;
    if (typeof onDesktopCloseFilters !== "function") return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onDesktopCloseFilters();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLgUp, desktopSidebarOpen, onDesktopCloseFilters]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    onSearchChange(value);
  };

  const applySort = (value) => {
    if (hasActiveCategory && value === "oldest") return;

    setLocalSortBy(value);
    onSortChange(value);
    closeSort();
  };

  const handleLocalClear = () => {
    onResetFilters();
    setLocalSearchTerm("");
    setLocalSortBy("newest");
    setIsSortOpen(false);

    if (!isLgUp) setIsFilterOpen(false);
    if (isLgUp && typeof onDesktopCloseFilters === "function") {
      onDesktopCloseFilters();
    }
  };

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
  const sortLabel = localSortBy === "oldest" ? "Oldest First" : "Newest First";

  const sortOptions = [
    { value: "newest", label: "Newest First", disabled: false },
    { value: "oldest", label: "Oldest First", disabled: hasActiveCategory },
  ];

  const wrapClass = variant === "card" ? "ui-card p-3 sm:p-4" : "w-full";

  return (
    <div className="w-full">
      <div className={wrapClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left group: search (optional) + sort + create slot */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {showSearch && (
              <div className="min-w-[220px] flex-1">
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

            {/* Sort dropdown */}
            <div className="sm:w-[220px]" ref={sortWrapRef}>
              <span id="home-sort-label" className="sr-only">
                Sort posts
              </span>

              <div className="relative">
                <button
                  type="button"
                  id="home-sort"
                  aria-haspopup="listbox"
                  aria-expanded={isSortOpen}
                  aria-labelledby="home-sort-label"
                  onClick={toggleSort}
                  className="ui-input flex w-full cursor-pointer items-center justify-between pr-10 text-left"
                >
                  <span className="truncate">{sortLabel}</span>

                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <AnimatePresence>
                  {isSortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/95 shadow-2xl ring-1 ring-zinc-100/5 backdrop-blur"
                    >
                      <ul
                        role="listbox"
                        aria-labelledby="home-sort-label"
                        className="py-1"
                      >
                        {sortOptions.map((opt) => {
                          const isSelected = localSortBy === opt.value;

                          const base =
                            "flex w-full items-center justify-between px-3 py-2 text-left text-sm";
                          const enabled =
                            "text-zinc-200 hover:bg-zinc-900/50 focus:outline-none focus-visible:bg-zinc-900/60";
                          const selected = "bg-zinc-900/60 text-zinc-100";
                          const disabled =
                            "cursor-not-allowed text-zinc-500 hover:bg-transparent";

                          return (
                            <li key={opt.value}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                disabled={opt.disabled}
                                onClick={() => applySort(opt.value)}
                                className={[
                                  base,
                                  opt.disabled
                                    ? disabled
                                    : isSelected
                                    ? selected
                                    : enabled,
                                ].join(" ")}
                              >
                                <span className="truncate">{opt.label}</span>

                                {isSelected && (
                                  <span className="ml-3 text-xs text-sky-300">
                                    Selected
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Create slot */}
            {afterSortSlot}
          </div>

          {/* Right group: Filters toggle */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={toggleFilterPanel}
              aria-expanded={isLgUp ? desktopSidebarOpen : isFilterOpen}
              aria-controls="filters-panel"
              className="ui-button-secondary w-full sm:w-auto"
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

      {/* Overlay filter panel (< md only) */}
      {!isLgUp && (
        <FilterPortal>
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                className="fixed inset-0 z-[60]"
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.button
                  type="button"
                  aria-label="Close filters"
                  className="absolute inset-0 h-full w-full bg-zinc-950/60"
                  variants={backdropVariants}
                  onClick={closeFilters}
                />

                <div className="absolute inset-0 flex items-end sm:items-stretch sm:justify-end">
                  <motion.div
                    id="filters-panel"
                    role="dialog"
                    aria-modal="true"
                    className="w-full rounded-t-2xl border border-zinc-800 bg-zinc-950/95
                     p-4 shadow-2xl backdrop-blur flex flex-col overflow-hidden h-[85vh]
                      pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:h-full sm:pb-4 sm:rounded-none sm:border-l 
                      sm:border-t-0 sm:w-[320px] min-[720px]:w-[380px]"
                    variants={
                      isSmUp ? panelVariantsDesktop : panelVariantsMobile
                    }
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <FiltersPanelContent
                      selectedCategories={selectedCategories}
                      onFilterChange={onFilterChange}
                      onReset={handleLocalClear}
                      onClose={closeFilters}
                    />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </FilterPortal>
      )}
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

  variant: PropTypes.oneOf(["card", "bare"]),
  afterSortSlot: PropTypes.node,

  desktopSidebarOpen: PropTypes.bool,
  onDesktopToggleFilters: PropTypes.func,
  onDesktopCloseFilters: PropTypes.func,
};

export default SearchAndFilterBar;
