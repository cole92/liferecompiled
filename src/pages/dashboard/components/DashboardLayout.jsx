import { useContext, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { db } from "../../../firebase";
import { AuthContext } from "../../../context/AuthContext";

import DashboardBreadcrumb from "./DashboardBreadcrumb";
import WelcomeBanner from "./WelcomeBanner";
import DashboardTabs from "./DashboardTabs";
import TrashFilterBar from "./TrashFilterBar";
import PostFilterBar from "./PostFilterBar";

/**
 * @component DashboardLayout
 *
 * Glavni layout za Dashboard sekciju (privatne rute).
 *
 * Namena:
 * - Prikazuje breadcrumb, opcioni welcome banner i tabs (ukljucujuci Trash badge sa brojem obrisanih postova)
 * - Obezbedjuje sticky header (breadcrumb + tabs + filteri) i skrolabilan sadrzaj ispod
 * - Slusa Firestore u realnom vremenu da bi pratila broj obrisanih postova za aktivnog korisnika
 * - Na osnovu rute prikazuje dodatne kontrole:
 *   - `/dashboard/trash` → `TrashFilterBar` (filtriranje po vremenskom opsegu za Trash)
 *   - `/dashboard` (MyPosts) → `PostFilterBar` (Active/Locked/All + search po naslovu)
 * - Prosledjuje filter stanje kroz `Outlet` context tako da child rute (MyPosts, Trash) dele isti izvor istine
 *
 * @returns {JSX.Element}
 */

const DashboardLayout = () => {
  const location = useLocation();
  const isTrashPage = location.pathname.includes("/trash"); // Trash ruta prikazuje dodatni filter bar za TTL (0–10 / 11–20 / 21–30)
  const isMyPostsPage = location.pathname === "/dashboard";
  const isSavedPage = location.pathname.includes("/saved");
  const showBanner = true; // (kasnije povezati sa localStorage za dismiss logiku)

  const { user } = useContext(AuthContext);
  const [trashCount, setTrashCount] = useState(0);
  const [filterRange, setFilterRange] = useState(null);
  const [filter, setFilter] = useState("all");
  const [savedSortDirection, setSavedSortDirection] = useState("desc");
  const [myPostsSearch, setMyPostsSearch] = useState(""); // Search string za MyPosts (server-side prefix search po title_lc)

  // Efekat: slusaj promene obrisanih postova u Firestore-u za trenutno ulogovanog korisnika
  useEffect(() => {
    if (!user.uid) return;

    const q = query(
      collection(db, "posts"),
      where("userId", "==", user.uid),
      where("deleted", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrashCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user.uid]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <div className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <DashboardBreadcrumb />

          {showBanner && (
            <div className="mt-4">
              <WelcomeBanner />
            </div>
          )}

          <div className="mt-4">
            <DashboardTabs trashCount={trashCount} />

            {isTrashPage && (
              <TrashFilterBar
                filterRange={filterRange}
                onFilterChange={setFilterRange}
              />
            )}

            {/* Prikaz filtera za postove samo na MyPosts stranici (ruta: /dashboard) */}
            {isMyPostsPage && (
              <PostFilterBar
                activeFilter={filter}
                onFilterChange={setFilter}
                searchTerm={myPostsSearch}
                onSearchChange={setMyPostsSearch}
              />
            )}

            {/* Sort bar za Saved sekciju (ruta: /dashboard/saved) */}
            {isSavedPage && (
              <div className="mt-3 flex flex-wrap gap-2">
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

      {/* Skrolabilni sadrzaj */}
      <div className="flex-grow overflow-y-auto">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Prosledjujemo filter stanje kroz Outlet context (Trash i MyPosts dele iste kontrolere) */}
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
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
