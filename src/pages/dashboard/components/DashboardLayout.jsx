import { useContext, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../../../firebase";
import { AuthContext } from "../../../context/AuthContext";

import DashboardBreadcrumb from "./DashboardBreadcrumb";
import DashboardTabs from "./DashboardTabs";
import TrashFilterBar from "./TrashFilterBar";
import PostFilterBar from "./PostFilterBar";

const DashboardLayout = () => {
  const location = useLocation();
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
    if (!user?.uid) return;

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

  return (
    <div className="pb-10">
      <div className="sticky top-16 z-40">
        <div className="w-full border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur">
          <div className="py-3">
            <div className="ui-card p-3 sm:p-4">
              <div className="hidden lg:block">
                <DashboardBreadcrumb />
              </div>

              <div className="mt-2">
                <DashboardTabs trashCount={trashCount} />
              </div>

              <div className="mt-3 space-y-2">
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
                  <div className="flex flex-wrap gap-2">
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
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6">
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
