import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { validCategories } from "../constants/postCategories";
import FilterPortal from "./modals/FilterPortal";
import { cx, SURFACE_PANEL } from "../constants/uiClasses";

/**
 * @component IconSort
 *
 * Small inline SVG used as a visual hint for the "Sort" control.
 * Kept local to avoid extra icon deps for a tiny, static asset.
 *
 * @param {string} [className] - Optional CSS classes for sizing/color (Tailwind or custom).
 * @returns {JSX.Element}
 */
const IconSort = ({ className = "" }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M7 7h10M7 12h7M7 17h4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M17 16l2 2 2-2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 6v12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

IconSort.propTypes = {
  className: PropTypes.string,
};

/**
 * @component IconFilter
 *
 * Small inline SVG used for the "Filters" button (mobile icon button).
 * Local component keeps bundle lean and avoids runtime icon styling differences.
 *
 * @param {string} [className] - Optional CSS classes for sizing/color (Tailwind or custom).
 * @returns {JSX.Element}
 */
const IconFilter = ({ className = "" }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M4 6h16l-6 7v5l-4 2v-7L4 6Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

IconFilter.propTypes = {
  className: PropTypes.string,
};

/**
 * @component FiltersPanelContent
 *
 * Filter UI used inside the overlay drawer (mobile) and inside the docked sidebar (desktop).
 *
 * Behavior:
 * - "Single category mode": selecting a category replaces the current selection (0 or 1 item).
 * - Trending sort disables category filtering to prevent "no results" confusion.
 *
 * Layout notes:
 * - Uses `min-h-0` so the category list can scroll inside a flex column.
 *
 * @param {string[]} selectedCategories - Current category selection (0..1 in v1 mode).
 * @param {(next: string[]) => void} onFilterChange - Updates selected categories.
 * @param {() => void} onReset - Clears filters (and may also reset search/sort at the parent level).
 * @param {() => void} onClose - Closes the panel (overlay or sidebar close action).
 * @param {boolean} [isTrending=false] - When true, disables category selection.
 * @returns {JSX.Element}
 */
export const FiltersPanelContent = ({
  selectedCategories,
  onFilterChange,
  onReset,
  onClose,
  isTrending = false,
}) => {
  const activeCount = selectedCategories?.length || 0;

  const handleCategoryChange = (event) => {
    if (isTrending) return;

    const { value } = event.target;
    const isActive = selectedCategories.includes(value);

    // v1: only one category can be active at a time (toggle off = clear)
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

      {/* IMPORTANT: `min-h-0` lets the list scroll within this flex column */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <h3 className="text-sm font-semibold text-zinc-200">
          Categories{activeCount > 0 ? ` (${activeCount})` : ""}
        </h3>

        {isTrending && (
          <p className="mt-2 text-xs text-zinc-400">
            Trending view disables category filters.
          </p>
        )}

        {/* Only the list scrolls to keep header/actions pinned */}
        <div className="mt-3 min-h-0 flex-1 overflow-auto pr-1 ui-scrollbar">
          <div className="space-y-2">
            {validCategories.map((categoryItem) => {
              const isActive = selectedCategories.includes(categoryItem);

              // Stable id ties label->input and improves a11y for long lists.
              const checkboxId = `filter-category-${categoryItem
                .toLowerCase()
                .replace(/\s+/g, "-")}`;

              return (
                <label
                  key={categoryItem}
                  htmlFor={checkboxId}
                  className={[
                    "flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2",
                    isTrending
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:bg-zinc-900/40",
                  ].join(" ")}
                >
                  <input
                    id={checkboxId}
                    name="categoryFilter"
                    type="checkbox"
                    value={categoryItem}
                    checked={isActive}
                    onChange={handleCategoryChange}
                    disabled={isTrending}
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
  isTrending: PropTypes.bool,
};

/**
 * @component SearchAndFilterBar
 *
 * Unified Search + Sort + Filters control bar for Home feed.
 *
 * Responsive behavior:
 * - < md (0-767): Filters open in an overlay drawer (bottom sheet on <sm, right drawer on sm+)
 * - >= md (768+): Filters are rendered as a docked sidebar controlled by the parent (Home)
 *
 * Behavior notes:
 * - "Single category mode (v1)": only one category can be active; selecting another replaces it.
 * - Oldest sort is disabled while a category is active (keeps query logic consistent).
 * - Trending sort clears categories because category filters are ignored in Trending view.
 * - Handles ESC and click-outside for UI overlays (sort dropdown + filter overlay).
 *
 * @param {Function} onSearchChange - Called with raw search string on each keystroke.
 * @param {Function} onSortChange - Called with sort key ("newest" | "oldest" | "trending").
 * @param {Function} onFilterChange - Called with selected categories array (0..1 in v1).
 * @param {Function} onResetFilters - Clears filter/search state at the parent level.
 * @param {string[]} selectedCategories - Current category selection.
 * @param {string} [sortBy] - Current global sort key from parent.
 * @param {boolean} [showSearch=true] - Toggle search input visibility (some pages may hide it).
 * @param {"card"|"bare"} [variant="card"] - Visual wrapper style for the bar container.
 * @param {React.ReactNode} [afterSortSlot=null] - Optional slot (e.g. Create button) placed next to Sort.
 * @param {boolean} [desktopSidebarOpen=false] - Controlled open state for docked sidebar (md+).
 * @param {Function|null} [onDesktopToggleFilters=null] - Parent handler for toggling docked sidebar (md+).
 * @param {Function|null} [onDesktopCloseFilters=null] - Parent handler for closing docked sidebar (md+).
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
  variant = "card",
  afterSortSlot = null,
  desktopSidebarOpen = false,
  onDesktopToggleFilters = null,
  onDesktopCloseFilters = null,
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [localSortBy, setLocalSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Breakpoint-driven UI: sm+ changes overlay style, md+ switches to docked sidebar.
  const [isSmUp, setIsSmUp] = useState(false);
  const [isLgUp, setIsLgUp] = useState(false);

  // Sort dropdown UI-only state (kept local to avoid global state churn).
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

    // Support older Safari via addListener/removeListener fallback.
    mqSm.addEventListener?.("change", sync) ?? mqSm.addListener(sync);
    mqMd.addEventListener?.("change", sync) ?? mqMd.addListener(sync);

    return () => {
      mqSm.removeEventListener?.("change", sync) ?? mqSm.removeListener(sync);
      mqMd.removeEventListener?.("change", sync) ?? mqMd.removeListener(sync);
    };
  }, []);

  // When switching to md+, close the overlay drawer to avoid double-UI states.
  useEffect(() => {
    if (isLgUp) setIsFilterOpen(false);
  }, [isLgUp]);

  // Keep local sort in sync with the parent-provided sort key.
  useEffect(() => {
    if (sortBy === "oldest" || sortBy === "newest" || sortBy === "trending") {
      setLocalSortBy(sortBy);
    } else {
      setLocalSortBy("newest");
    }
  }, [sortBy]);

  const isTrendingSort = localSortBy === "trending" || sortBy === "trending";

  const hasActiveCategory =
    !isTrendingSort &&
    Array.isArray(selectedCategories) &&
    selectedCategories.length === 1;

  // Guard: Oldest is not compatible with v1 single-category query logic, so force Newest.
  useEffect(() => {
    if (hasActiveCategory && localSortBy === "oldest") {
      setLocalSortBy("newest");
      onSortChange("newest");
    }
  }, [hasActiveCategory, localSortBy, onSortChange]);

  const closeFilters = useCallback(() => setIsFilterOpen(false), []);

  const toggleFilterPanel = () => {
    // md+: docked sidebar is controlled by the parent.
    if (isLgUp && typeof onDesktopToggleFilters === "function") {
      onDesktopToggleFilters();
      return;
    }

    setIsFilterOpen((prev) => !prev);
  };

  const closeSort = useCallback(() => setIsSortOpen(false), []);
  const toggleSort = () => setIsSortOpen((prev) => !prev);

  // Close sort on ESC / click outside (UI-only, no app side effects).
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

  // Overlay filters: ESC closes + lock body scroll to prevent background scrolling.
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

  // Docked sidebar: ESC can close the sidebar if parent provides a handler.
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

    // Trending ignores category filters, so clear them to keep UI state honest.
    if (value === "trending") {
      onFilterChange([]);
    }

    setLocalSortBy(value);
    onSortChange(value);
    closeSort();
  };

  const handleLocalClear = () => {
    onResetFilters();
    setLocalSearchTerm("");
    setLocalSortBy("newest");
    setIsSortOpen(false);

    // Reset should also exit overlays for clarity.
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

  const sortLabel =
    localSortBy === "trending"
      ? "Trending 🔥"
      : localSortBy === "oldest"
        ? "Oldest First"
        : "Newest First";

  const sortLabelShort =
    localSortBy === "trending"
      ? "Trending 🔥"
      : localSortBy === "oldest"
        ? "Oldest"
        : "Newest";

  const sortOptions = [
    { value: "newest", label: "Newest First", disabled: false },
    { value: "oldest", label: "Oldest First", disabled: hasActiveCategory },
    { value: "trending", label: "Trending 🔥", disabled: false },
  ];

  const wrapClass = variant === "card" ? "ui-card p-3 sm:p-4" : "w-full";

  return (
    <div className="w-full">
      <div className={wrapClass}>
        <div className="flex flex-col gap-3">
          {showSearch && (
            <div className="w-full">
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

          {/* Actions row:
              - mobile: Sort (flex-1) + Create slot + Filters icon
              - sm+: keep Create next to Sort, Filters button on the right
          */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Sort dropdown */}
              <div
                className="flex-1 min-w-0 sm:flex-none sm:w-[220px]"
                ref={sortWrapRef}
              >
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
                    className="ui-input relative flex w-full cursor-pointer items-center justify-between pr-10 pl-10 sm:pl-3 text-left"
                  >
                    {/* Mobile-only icon helps hint "this is a dropdown" */}
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 sm:hidden">
                      <IconSort className="h-4 w-4" />
                    </span>

                    <span className="truncate">
                      <span className="sm:hidden">{sortLabelShort}</span>
                      <span className="hidden sm:inline">{sortLabel}</span>
                    </span>

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
                        className={cx(
                          "absolute z-30 mt-2.5 sm:mt-3 w-full overflow-hidden rounded-xl backdrop-blur",
                          SURFACE_PANEL,
                          "ring-1 ring-sky-200/10 border-sky-500/15",
                        )}
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

              {/* Create slot (Home should pass mobile+desktop variants) */}
              {afterSortSlot && <div className="shrink-0">{afterSortSlot}</div>}

              {/* Mobile Filters icon button */}
              <button
                type="button"
                onClick={toggleFilterPanel}
                aria-expanded={isLgUp ? desktopSidebarOpen : isFilterOpen}
                aria-controls="filters-panel"
                aria-label="Open filters"
                className="ui-button-secondary relative inline-flex h-11 w-11 items-center justify-center p-0 sm:hidden"
              >
                <IconFilter className="h-5 w-5" />

                {activeCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500/20 px-1 text-[11px] font-semibold text-sky-100 ring-1 ring-sky-200/20">
                    {activeCount}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop Filters button */}
            <div className="hidden sm:flex items-center justify-end">
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
            <p className="text-sm text-zinc-300">
              Single category mode (v1): selecting another category switches the
              active one. Oldest sort remains disabled while a category is
              active.
            </p>
          )}
        </div>
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
                  aria-hidden="true"
                  tabIndex={-1}
                  className="absolute inset-0 h-full w-full bg-zinc-950/60"
                  variants={backdropVariants}
                  onClick={closeFilters}
                />

                <div className="absolute inset-0 flex items-end sm:items-stretch sm:justify-end">
                  <motion.div
                    id="filters-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Filters"
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
                      isTrending={isTrendingSort}
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
