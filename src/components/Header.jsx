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
 * - Na home stranici ("/") prikazuje SearchAndFilterBar sa animacijom (framer-motion)
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

  // Varijante animacije za Search/Filter bar (ulaz i izlaz)
  const searchBarVariants = {
    hidden: { opacity: 0, y: -15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  };

  // Dok se proverava autentikacija (inicijalni load), prikazuje se spinner
  if (isCheckingAuth) {
    return (
      <div>
        <h1>
          Checking authentication <Spinner message="" />
        </h1>
      </div>
    );
  }

  return (
    <header className="d-flex flex-column p-2 bg-light">
      <div className="d-flex justify-content-between align-items-center">
        {/* Logo + naziv brenda (link ka Home) */}
        <NavLink
          to="/"
          className="navbar-brand text-dark text-decoration-none fs-4"
        >
          <span className="font-bold text-blue-600">{"<LR/>"} </span>
          <span className="font-semibold">
            Life
            <span className="text-blue-600"> Recompiled</span>
          </span>
        </NavLink>

        {/* Navigacioni deo zavisi od statusa korisnika */}
        {user ? (
          <AvatarDropdown
            user={user}
            logout={logout}
            isLoggingOut={isLoggingOut}
          />
        ) : (
          <>
            {!isLogin && (
              <NavLink to="/login" className="btn btn-outline-primary me-2">
                Login
              </NavLink>
            )}
            {!isRegister && (
              <NavLink to="/register" className="btn btn-outline-success">
                Register
              </NavLink>
            )}
          </>
        )}
      </div>

      {/* Search/Filter bar se prikazuje samo na Home stranici */}
      {pathname === "/" && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={searchBarVariants}
        >
          <SearchAndFilterBar
            onSearchChange={setSearchTerm}
            onSortChange={setSortBy}
            onFilterChange={setSelectedCategories}
            onResetFilters={handleResetFilters}
            selectedCategories={selectedCategories}
            sortBy={sortBy}   
          />
        </motion.div>
      )}

      {/* Create dugme: kontrolisano preko canShowCreateButton */}
      <div>
        {canShowCreateButton && (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            onClick={() => navigate("/dashboard/create")}
          >
            Create New Post
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
