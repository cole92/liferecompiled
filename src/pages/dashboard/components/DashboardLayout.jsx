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
 * Layout komponenta za Dashboard sekciju.
 *
 * - Prikazuje breadcrumb, opcioni banner, i tabove (uklj. Trash broj)
 * - Omogucava prikaz child ruta pomocu <Outlet />
 * - Povezana na Firestore kako bi pratila broj obrisanih postova u realnom vremenu
 *
 * @component
 * @returns {JSX.Element}
 */

const DashboardLayout = () => {
  const location = useLocation();
  const isTrashPage = location.pathname.includes("/trash"); // Proveravamo da li je aktivna Trash stranica kako bismo prikazali filter
  const isMyPostsPage = location.pathname === "/dashboard";
  const showBanner = true; // (kasnije povezati sa localStorage za dismiss logiku)

  const { user } = useContext(AuthContext);
  const [trashCount, setTrashCount] = useState(0);
  const [filterRange, setFilterRange] = useState(null);
  const [filter, setFilter] = useState("all");
  const [myPostsSearch, setMyPostsSearch] = useState(""); // search za MyPosts

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
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="sticky top-0 z-20 bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
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
          </div>
        </div>
      </div>

      {/* Skrolabilni sadrzaj */}
      <div className="flex-grow overflow-y-auto">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Prosleđujemo filterRange i setter kao kontekst child komponentama (npr. Trash.jsx) */}
          <Outlet
            context={{
              filterRange,
              setFilterRange,
              filter,
              setFilter,
              myPostsSearch,
              setMyPostsSearch,
            }}
          />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
