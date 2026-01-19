import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useContext, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { AuthContext } from "../../../context/AuthContext";

const IconSearch = ({ className = "" }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21 21l-4.2-4.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

IconSearch.propTypes = {
  className: PropTypes.string,
};

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

const PostFilterBar = ({
  activeFilter,
  onFilterChange,
  searchTerm,
  onSearchChange,
  showDesktopSearch = true,
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
        activeClass:
          "bg-emerald-500/12 text-emerald-200 ring-1 ring-inset ring-emerald-400/25",
      },
      {
        label: "Locked",
        value: "locked",
        activeClass:
          "bg-rose-500/12 text-rose-200 ring-1 ring-inset ring-rose-400/25",
      },
      {
        label: "All",
        value: "all",
        activeClass:
          "bg-zinc-100/10 text-zinc-100 ring-1 ring-inset ring-zinc-200/15",
      },
    ],
    [],
  );

  const hasSearch = searchTerm.trim().length > 0;

  const [openPanel, setOpenPanel] = useState(hasSearch ? "search" : "none");

  useEffect(() => {
    if (hasSearch) setOpenPanel("search");
  }, [hasSearch]);

  const activeFilterLabel =
    filters.find((f) => f.value === activeFilter)?.label || "All";

  const togglePanel = (next) => {
    setOpenPanel((prev) => (prev === next ? "none" : next));
  };

  const iconBtn =
    "ui-button-secondary inline-flex h-11 w-11 items-center justify-center p-0";

  const statusPill =
    "inline-flex h-11 w-full items-center justify-center rounded-xl " +
    "border border-zinc-800 bg-zinc-950/40 px-3 text-sm text-zinc-200 " +
    "truncate";

  return (
    <div className="w-full">
      {/* Mobile (<sm) compact actions */}
      <div className="sm:hidden">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => togglePanel("search")}
              aria-label="Toggle search"
              aria-pressed={openPanel === "search"}
              className={iconBtn}
            >
              <IconSearch className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => togglePanel("filters")}
              aria-label="Toggle filters"
              aria-pressed={openPanel === "filters"}
              disabled={hasSearch}
              aria-disabled={hasSearch}
              className={`${iconBtn} ${hasSearch ? "opacity-40 cursor-not-allowed" : ""}`}
              title={hasSearch ? "Filters disabled in search mode" : "Filters"}
            >
              <IconFilter className="h-5 w-5" />
            </button>

            {canCreate && (
              <NavLink
                to="/dashboard/create"
                aria-label="Create new post"
                title="Create new post"
                className="ui-button-primary inline-flex h-11 w-11 items-center justify-center p-0"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </NavLink>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {hasSearch ? (
              <span className={statusPill}>Search mode</span>
            ) : (
              <span className={statusPill}>{activeFilterLabel}</span>
            )}
          </div>
        </div>

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

      {/* sm+ layout */}
      <div className="hidden sm:block">
        <div
          className={[
            "flex flex-col gap-3 sm:flex-row sm:items-center",
            showDesktopSearch ? "sm:justify-between" : "sm:justify-start",
          ].join(" ")}
        >
          <motion.div
            initial={false}
            animate={{
              opacity: showDesktopSearch
                ? hasSearch
                  ? 0
                  : 1
                : hasSearch
                  ? 0.55
                  : 1,
              y: showDesktopSearch ? (hasSearch ? -4 : 0) : 0,
            }}
            transition={{ duration: 0.2 }}
            className={`w-full sm:w-auto ${hasSearch ? "pointer-events-none" : ""}`}
            aria-hidden={false}
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

          {showDesktopSearch && (
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
          )}
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
  showDesktopSearch: PropTypes.bool,
};

export default PostFilterBar;
