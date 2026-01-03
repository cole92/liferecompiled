import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import AvatarDropdown from "./AvatarDropdown";
import { motion } from "framer-motion";
import SearchAndFilterBar from "../components/SearchAndFilterBar";
import useSearch from "../context/useSearch";
import Spinner from "./Spinner";

/**
 * @component Header
 * Prikazuje zaglavlje aplikacije sa navigacionim linkovima i Search/Filter bar-om.
 *
 * - Koristi AuthContext za proveru statusa korisnika i logout funkcionalnost
 * - Ako korisnik nije ulogovan, prikazuje Login i Register dugmad (osim na odgovarajucim stranicama)
 * - Ako je korisnik ulogovan, prikazuje Avatar meni sa opcijama
 * - Koristi useSearch context za upravljanje filterima i pretragom
 * - Prikazuje dugme "Create New Post" samo kada je korisnik ulogovan i ruta NIJE u restricted listi
 *
 * @returns {JSX.Element} Zaglavlje sa navigacijom i, uslovno, filter bar-om
 */
const Header = () => {
  const { user, isLoggingOut, logout, isCheckingAuth } =
    useContext(AuthContext);

  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

  // Lista ruta gde se "Create New Post" NE prikazuje.
  // Napomena: koristi se tacno poredjenje (includes na nizu), ne prefix match.
  // Primer: "/post/123" NIJE isto sto i "/post/" i nece biti blokirano ovom listom.
  const restrictedPaths = [
    "/dashboard",
    "/dashboard/settings",
    "/profile",
    "/post/",
  ];

  // Dugme se prikazuje samo ako je user ulogovan i ruta NIJE na restricted listi.
  const canShowCreateButton = user && !restrictedPaths.includes(pathname);

  const {
    setSearchTerm,
    setSortBy,
    setSelectedCategories,
    selectedCategories,
    handleResetFilters,
    sortBy,
  } = useSearch();

  const searchBarVariants = {
    hidden: { opacity: 0, y: -15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  };

  if (isCheckingAuth) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-zinc-200">
          <span>Checking authentication</span>
          <Spinner message="" />
        </div>
      </div>
    );
  }

  const authBtnBase =
    "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

  return (
    <header className="w-full">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <NavLink
            to="/"
            className="flex items-center gap-2 text-zinc-100 no-underline"
            aria-label="Go to Home"
          >
            <span className="font-bold text-blue-400">{"<LR/>"}</span>
            <span className="font-semibold">
              Life <span className="text-blue-400">Recompiled</span>
            </span>
          </NavLink>

          <div className="flex items-center gap-2">
            {user ? (
              <AvatarDropdown
                user={user}
                logout={logout}
                isLoggingOut={isLoggingOut}
              />
            ) : (
              <>
                {!isLogin && (
                  <NavLink
                    to="/login"
                    className={`${authBtnBase} border border-blue-500/40 bg-transparent text-blue-200 hover:bg-blue-500/10`}
                  >
                    Login
                  </NavLink>
                )}
                {!isRegister && (
                  <NavLink
                    to="/register"
                    className={`${authBtnBase} border border-emerald-500/40 bg-transparent text-emerald-200 hover:bg-emerald-500/10`}
                  >
                    Register
                  </NavLink>
                )}
              </>
            )}
          </div>
        </div>

        {pathname === "/" && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={searchBarVariants}
            className="mt-3"
          >
            <SearchAndFilterBar
              onSearchChange={setSearchTerm}
              onSortChange={setSortBy}
              onFilterChange={setSelectedCategories}
              onResetFilters={handleResetFilters}
              selectedCategories={selectedCategories}
              sortBy={sortBy}
              showSearch={false}
            />
          </motion.div>
        )}

        {canShowCreateButton && (
          <div className="mt-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              onClick={() => navigate("/dashboard/create")}
            >
              Create New Post
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
