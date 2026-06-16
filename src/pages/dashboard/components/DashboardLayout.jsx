import { Suspense, useContext, useEffect, useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../../../firebase";
import { AuthContext } from "../../../context/AuthContext";

import DashboardBreadcrumb from "./DashboardBreadcrumb";
import DashboardTabs from "./DashboardTabs";
import TrashFilterBar from "./TrashFilterBar";
import PostFilterBar from "./PostFilterBar";

const DashboardChildFallback = () => (
  <section
    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-sm sm:p-5"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="space-y-3">
      <div className="h-3 w-28 rounded-full bg-zinc-800" />
      <div className="h-7 w-52 max-w-full rounded-lg bg-zinc-900" />
      <div className="h-4 w-full max-w-xl rounded bg-zinc-900" />
    </div>

    <span className="sr-only">Loading dashboard page...</span>
  </section>
);

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
 * - < lg: compact stacked toolbar for phone/tablet widths.
 * - lg+: short product-navigation toolbar with page controls inline/nearby.
 *
 * @returns {JSX.Element}
 */
const DashboardLayout = () => {
  const location = useLocation();

  // Route-derived UI mode flags for conditional header controls.
  const isTrashPage = location.pathname.includes("/trash");
  const isMyPostsPage = location.pathname === "/dashboard";
  const isSavedPage = location.pathname.includes("/saved");
  const isCreatePage = location.pathname === "/dashboard/create";
  const isEditPage = location.pathname.startsWith("/dashboard/edit/");
  const isEditorPage = isCreatePage || isEditPage;

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
    "rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-2 shadow-sm sm:px-3 lg:px-4";

  const savedSortButtonClass = (value) =>
    `shrink-0 rounded-full border px-3 py-1 text-xs transition
      focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
      focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
        savedSortDirection === value
          ? "border-zinc-100 bg-zinc-100 text-zinc-950"
          : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
      }`;

  const savedSortControls = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Saved sort is stored in Outlet context and consumed by SavedPosts page. */}
      <button
        type="button"
        onClick={() => setSavedSortDirection("desc")}
        className={savedSortButtonClass("desc")}
      >
        Recently saved
      </button>

      <button
        type="button"
        onClick={() => setSavedSortDirection("asc")}
        className={savedSortButtonClass("asc")}
      >
        Oldest saved
      </button>
    </div>
  );

  const createButton = isMyPostsPage ? (
    <NavLink
      to="/dashboard/create"
      className="ui-button-primary whitespace-nowrap px-3 py-2 text-sm"
    >
      Create post
    </NavLink>
  ) : null;

  return (
    <div className="pb-2">
      <div className="sticky top-16 z-40">
        <div className="w-full border-b border-zinc-800 bg-zinc-950">
          <div className={isEditorPage ? "py-1 sm:py-1.5" : "py-1.5 sm:py-2"}>
            <div className={dashboardPanel}>
              {/* Phone + tablet: keep a compact stacked toolbar until lg. */}
              <div className="lg:hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    {!isEditorPage && (
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                        Workspace
                      </p>
                    )}
                    <h1
                      className={
                        isEditorPage
                          ? "text-sm font-semibold text-zinc-100"
                          : "text-base font-semibold text-zinc-100"
                      }
                    >
                      Dashboard
                    </h1>
                  </div>

                  <div className="hidden sm:block">{createButton}</div>
                </div>

                <div className="mt-1.5">
                  <DashboardTabs
                    trashCount={trashCount}
                    isAdmin={Boolean(user?.isAdmin)}
                  />
                </div>

                <div
                  className={[
                    isEditorPage ? "hidden" : "mt-2",
                    "space-y-2",
                  ].join(" ")}
                >
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

                  {isSavedPage && savedSortControls}
                </div>
              </div>

              {/* Desktop/laptop: compact product-navigation toolbar. */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] items-center gap-4">
                  <div className="min-w-0">
                    <DashboardBreadcrumb />
                    <h1 className="mt-0.5 text-base font-semibold text-zinc-100">
                      Dashboard
                    </h1>
                  </div>

                  <DashboardTabs
                    trashCount={trashCount}
                    isAdmin={Boolean(user?.isAdmin)}
                  />

                  <div className="flex min-w-0 items-center justify-end gap-2">
                    {isTrashPage && (
                      <div className="max-w-full">
                        <TrashFilterBar
                          filterRange={filterRange}
                          onFilterChange={setFilterRange}
                        />
                      </div>
                    )}

                    {isSavedPage && savedSortControls}

                    {createButton}
                  </div>
                </div>

                {isMyPostsPage && (
                  <div className="mt-2 border-t border-zinc-800 pt-2">
                    <PostFilterBar
                      activeFilter={filter}
                      onFilterChange={setFilter}
                      searchTerm={myPostsSearch}
                      onSearchChange={setMyPostsSearch}
                    />
                  </div>
                )}

                {!isEditorPage && !isMyPostsPage && !isTrashPage && !isSavedPage && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Manage posts, saved items, insights, and recovery tools.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={isEditorPage ? "pt-3 sm:pt-4" : "pt-4 sm:pt-5"}>
        {/* Outlet context is the single shared source for dashboard filter/sort UI state. */}
        <Suspense fallback={<DashboardChildFallback />}>
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
        </Suspense>
      </div>
    </div>
  );
};

export default DashboardLayout;
