import { useContext, useEffect, useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../../../firebase";
import { AuthContext } from "../../../context/AuthContext";

import DashboardBreadcrumb from "./DashboardBreadcrumb";
import DashboardTabs from "./DashboardTabs";
import TrashFilterBar from "./TrashFilterBar";
import PostFilterBar from "./PostFilterBar";

/**
 * @component DashboardLayout
 *
 * Shared layout shell for all `/dashboard/*` routes.
 *
 * Responsibilities:
 * - Renders a sticky header panel with tabs + page-specific controls.
 * - Exposes shared dashboard UI state to nested routes via `Outlet` context.
 * - Subscribes to trash count in real time to keep the Trash tab badge accurate.
 *
 * Responsive behavior:
 * - md+: uses a 2-col grid so controls can align (tabs left, actions/search right).
 * - < md: stacks controls vertically to keep the header compact on mobile.
 *
 * @returns {JSX.Element}
 */
const DashboardLayout = () => {
  const location = useLocation();

  // Route-derived UI mode flags for conditional header controls.
  const isTrashPage = location.pathname.includes("/trash");
  const isMyPostsPage = location.pathname === "/dashboard";
  const isSavedPage = location.pathname.includes("/saved");

  const { user } = useContext(AuthContext);

  const [trashCount, setTrashCount] = useState(0);
  const [filterRange, setFilterRange] = useState(null);
  const [filter, setFilter] = useState("all");
  const [savedSortDirection, setSavedSortDirection] = useState("desc");
  const [myPostsSearch, setMyPostsSearch] = useState("");

  useEffect(() => {
    // Guard: do not subscribe until we have a stable uid.
    if (!user?.uid) return;

    // Live trash count is derived from the user's `deleted === true` posts.
    // Keeps tab badge accurate without manual refresh.
    const q = query(
      collection(db, "posts"),
      where("userId", "==", user.uid),
      where("deleted", "==", true),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrashCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const dashboardPanel =
    "ui-card p-2.5 sm:p-4 " +
    "border-zinc-800/70 " +
    "bg-gradient-to-b from-sky-500/5 via-zinc-950/20 to-zinc-950/30 " +
    "ring-sky-200/10";

  return (
    <div className="pb-2">
      <div className="sticky top-16 z-40">
        <div className="w-full border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur">
          <div className="py-2 sm:py-3">
            <div className={dashboardPanel}>
              {/* md+ uses a 2-col / 2-row grid so Search can live on the far right */}
              <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_minmax(320px,28rem)] md:gap-6">
                {/* Row 1, Col 1 */}
                <div className="min-w-0">
                  <div className="hidden lg:block">
                    <DashboardBreadcrumb />
                  </div>

                  <div className="mt-1.5 sm:mt-2">
                    <DashboardTabs
                      trashCount={trashCount}
                      isAdmin={Boolean(user?.isAdmin)}
                    />
                  </div>
                </div>

                {/* Row 1, Col 2 */}
                <div className="flex items-center justify-end gap-2">
                  {/* Email is informational only (truncate prevents header overflow). */}
                  {user?.email ? (
                    <span className="text-sm text-zinc-300 max-w-[360px] truncate">
                      {user.email}
                    </span>
                  ) : null}

                  {isMyPostsPage && (
                    <NavLink
                      to="/dashboard/create"
                      className="ui-button-primary"
                    >
                      Create post
                    </NavLink>
                  )}
                </div>

                {/* Row 2, Col 1 */}
                <div className="min-w-0 mt-2 sm:mt-3">
                  {isTrashPage && (
                    <TrashFilterBar
                      filterRange={filterRange}
                      onFilterChange={setFilterRange}
                    />
                  )}

                  {isMyPostsPage && (
                    <PostFilterBar
                      activeFilter={filter}
                      onFilterChange={setFilter}
                      searchTerm={myPostsSearch}
                      onSearchChange={setMyPostsSearch}
                      showDesktopSearch={false}
                    />
                  )}

                  {isSavedPage && (
                    <div className="flex flex-wrap gap-2">
                      {/* Saved sort is stored in Outlet context and consumed by SavedPosts page. */}
                      <button
                        type="button"
                        onClick={() => setSavedSortDirection("desc")}
                        className={`px-3 py-1 text-xs rounded-full border transition
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                          focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                            savedSortDirection === "desc"
                              ? "bg-zinc-100 text-zinc-950 border-zinc-100"
                              : "border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/40"
                          }`}
                      >
                        Recently saved
                      </button>

                      <button
                        type="button"
                        onClick={() => setSavedSortDirection("asc")}
                        className={`px-3 py-1 text-xs rounded-full border transition
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
                          focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                            savedSortDirection === "asc"
                              ? "bg-zinc-100 text-zinc-950 border-zinc-100"
                              : "border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/40"
                          }`}
                      >
                        Oldest saved
                      </button>
                    </div>
                  )}
                </div>

                {/* Row 2, Col 2 (Search on far right) */}
                <div className="min-w-0 mt-2 sm:mt-3">
                  {isMyPostsPage && (
                    <div className="w-full">
                      <label htmlFor="my-posts-search-md" className="sr-only">
                        Search your posts by title
                      </label>
                      <input
                        id="my-posts-search-md"
                        name="myPostsSearch"
                        type="text"
                        value={myPostsSearch}
                        onChange={(e) => setMyPostsSearch(e.target.value)}
                        placeholder="Search your posts by title..."
                        autoComplete="off"
                        className="ui-input w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile-only bars keep the same controls, stacked for smaller screens. */}
              <div className="md:hidden">
                <div className="hidden lg:block">
                  <DashboardBreadcrumb />
                </div>

                <div className="mt-1.5 sm:mt-2">
                  <DashboardTabs
                    trashCount={trashCount}
                    isAdmin={Boolean(user?.isAdmin)}
                  />
                </div>

                <div className="mt-2 sm:mt-3 space-y-2">
                  {isTrashPage && (
                    <TrashFilterBar
                      filterRange={filterRange}
                      onFilterChange={setFilterRange}
                    />
                  )}

                  {isMyPostsPage && (
                    <PostFilterBar
                      activeFilter={filter}
                      onFilterChange={setFilter}
                      searchTerm={myPostsSearch}
                      onSearchChange={setMyPostsSearch}
                    />
                  )}

                  {isSavedPage && (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSavedSortDirection("desc")}
                        className={`shrink-0 px-3 py-1 text-xs rounded-full border transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
        focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
          savedSortDirection === "desc"
            ? "bg-zinc-100 text-zinc-950 border-zinc-100"
            : "border border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/40"
        }`}
                      >
                        Recently saved
                      </button>

                      <button
                        type="button"
                        onClick={() => setSavedSortDirection("asc")}
                        className={`shrink-0 px-3 py-1 text-xs rounded-full border transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
        focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
          savedSortDirection === "asc"
            ? "bg-zinc-100 text-zinc-950 border-zinc-100"
            : "border border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/40"
        }`}
                      >
                        Oldest saved
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6">
        {/* Outlet context is the single shared source for dashboard filter/sort UI state. */}
        <Outlet
          context={{
            filterRange,
            setFilterRange,
            filter,
            setFilter,
            myPostsSearch,
            setMyPostsSearch,
            savedSortDirection,
            setSavedSortDirection,
          }}
        />
      </div>
    </div>
  );
};

export default DashboardLayout;
