import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useContext, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { AuthContext } from "../../../context/AuthContext";

/**
 * PostFilterBar
 *
 * Mobile-first:
 * - Tabs are above (DashboardTabs)
 * - This bar becomes compact on <sm:
 *   - action row with Search / Filters / Create buttons
 *   - only one panel can be open at a time
 * - sm+: classic layout (filters left, search right)
 *
 * Behavior:
 * - When searchTerm is non-empty, filters are disabled (search mode).
 * - UI-only local state for panel toggles (does not touch fetch/filter logic).
 */
const PostFilterBar = ({
  activeFilter,
  onFilterChange,
  searchTerm,
  onSearchChange,
}) => {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();

  const isMyPostsPage = pathname === "/dashboard";
  const canCreate = Boolean(user?.email) && isMyPostsPage;

  const filters = useMemo(
    () => [
      {
        label: "Active",
        value: "active",
        activeClass: "bg-emerald-500/12 text-emerald-200",
      },
      {
        label: "Locked",
        value: "locked",
        activeClass: "bg-rose-500/12 text-rose-200",
      },
      {
        label: "All",
        value: "all",
        activeClass: "bg-zinc-100/10 text-zinc-100",
      },
    ],
    [],
  );

  const hasSearch = searchTerm.trim().length > 0;

  // Panels: "none" | "search" | "filters"
  const [openPanel, setOpenPanel] = useState(hasSearch ? "search" : "none");

  // If search becomes active from outside, make sure search panel is visible on mobile.
  useEffect(() => {
    if (hasSearch) setOpenPanel("search");
  }, [hasSearch]);

  const activeFilterLabel =
    filters.find((f) => f.value === activeFilter)?.label || "All";

  const togglePanel = (next) => {
    setOpenPanel((prev) => (prev === next ? "none" : next));
  };

  const iconBtnBase =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl " +
    "border border-zinc-800 bg-zinc-950/40 text-zinc-200 " +
    "hover:bg-zinc-900/40 hover:text-zinc-100 transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

  const createBtn =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl " +
    "bg-sky-500 text-zinc-50 hover:bg-sky-400 transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

  return (
    <div className="w-full">
      {/* Mobile (<sm) compact actions */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => togglePanel("search")}
              aria-label="Toggle search"
              aria-pressed={openPanel === "search"}
              className={iconBtnBase}
            >
              <span className="text-lg leading-none">🔍</span>
            </button>

            <button
              type="button"
              onClick={() => togglePanel("filters")}
              aria-label="Toggle filters"
              aria-pressed={openPanel === "filters"}
              disabled={hasSearch}
              aria-disabled={hasSearch}
              className={`${iconBtnBase} ${
                hasSearch ? "opacity-40 cursor-not-allowed" : ""
              }`}
              title={hasSearch ? "Filters disabled in search mode" : "Filters"}
            >
              <span className="text-lg leading-none">⚙️</span>
            </button>

            {canCreate && (
              <NavLink
                to="/dashboard/create"
                aria-label="Create new post"
                title="Create new post"
                className={createBtn}
              >
                <span className="text-xl leading-none">+</span>
              </NavLink>
            )}
          </div>

          {/* Small summary chip so user always knows current mode */}
          <div className="flex items-center gap-2">
            {hasSearch ? (
              <span className="text-xs text-zinc-400">Search mode</span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-300">
                {activeFilterLabel}
              </span>
            )}
          </div>
        </div>

        {/* Panels */}
        {openPanel !== "none" && (
          <div className="mt-2">
            {openPanel === "search" && (
              <div className="flex w-full items-center gap-2">
                <input
                  id="my-posts-search"
                  name="myPostsSearch"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search by title..."
                  aria-label="Search your posts by title"
                  autoComplete="off"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-zinc-100 placeholder:text-zinc-500
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                    focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                />

                {(hasSearch || searchTerm.length > 0) && (
                  <button
                    type="button"
                    onClick={() => onSearchChange("")}
                    aria-label="Clear search"
                    className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/40 hover:text-zinc-100 transition
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                      focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {openPanel === "filters" && !hasSearch && (
              <div className="inline-flex w-full items-center rounded-xl border border-zinc-800 bg-zinc-950/40 p-1">
                {filters.map((f) => {
                  const isActive = activeFilter === f.value;

                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => onFilterChange(f.value)}
                      className={[
                        "flex-1",
                        "rounded-lg px-3 py-2 text-sm transition",
                        "text-zinc-300 hover:text-zinc-100",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
                        "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                        isActive ? f.activeClass : "bg-transparent",
                      ].join(" ")}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* sm+ layout (classic, stable) */}
      <div className="hidden sm:block">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Filters left */}
          <motion.div
            initial={false}
            animate={{ opacity: hasSearch ? 0 : 1, y: hasSearch ? -4 : 0 }}
            transition={{ duration: 0.2 }}
            className={`w-full sm:w-auto ${hasSearch ? "pointer-events-none" : ""}`}
            aria-hidden={hasSearch}
          >
            <div className="inline-flex w-full items-center rounded-xl border border-zinc-800 bg-zinc-950/40 p-1 sm:w-auto">
              {filters.map((f) => {
                const isActive = activeFilter === f.value;

                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => onFilterChange(f.value)}
                    className={[
                      "flex-1 sm:flex-none",
                      "rounded-lg px-3 py-1.5 text-sm transition",
                      "text-zinc-300 hover:text-zinc-100",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
                      "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                      isActive ? f.activeClass : "bg-transparent",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Search right */}
          <div className="flex w-full items-center gap-2 sm:w-auto sm:max-w-md sm:ml-auto">
            <input
              id="my-posts-search-sm"
              name="myPostsSearch"
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search your posts by title..."
              aria-label="Search your posts by title"
              autoComplete="off"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-zinc-100 placeholder:text-zinc-500
                focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            />

            {hasSearch && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                className="shrink-0 text-sm text-zinc-300 underline hover:text-zinc-100"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

PostFilterBar.propTypes = {
  activeFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  searchTerm: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
};

export default PostFilterBar;
