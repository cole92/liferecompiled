import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { NavLink, useLocation } from "react-router-dom";
import AvatarDropdown from "./AvatarDropdown";
import { motion } from "framer-motion";
import SearchAndFilterBar from "../components/SearchAndFilterBar";
import useSearch from "../context/useSearch";

/**
 * @component Header
 * Prikazuje zaglavlje aplikacije sa navigacionim linkovima i Search bar-om.
 *
 * - Ako korisnik nije ulogovan, prikazuje Login i Register dugmad (osim na tim stranicama)
 * - Ako je korisnik ulogovan, prikazuje Avatar meni
 * - Na Home stranici prikazuje SearchAndFilterBar sa animacijom
 *
 * @returns {JSX.Element} Zaglavlje sa navigacijom i filterima
 */


const Header = () => {
  const { user, isLoggingOut, logout } = useContext(AuthContext);
  const { pathname } = useLocation();

  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

  const {
    setSearchTerm,
    setSortBy,
    setSelectedCategories,
    selectedCategories,
    handleResetFilters,
  } = useSearch();

  // Animacija za FilterBar
  const searchBarVariants = {
    hidden: { opacity: 0, y: -15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeInOut" },
    },
  };

  return (
    <header className="d-flex flex-column p-2 bg-light">
      <div className="d-flex justify-content-between align-items-center">
        <NavLink
          to="/"
          className="navbar-brand text-dark text-decoration-none fs-4"
        >
          Blog App
        </NavLink>

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
          />
        </motion.div>
      )}
    </header>
  );
};

export default Header;
