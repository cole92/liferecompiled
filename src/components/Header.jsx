import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { NavLink, useLocation } from "react-router-dom";
import AvatarDropdown from "./AvatarDropdown";
import { motion } from "framer-motion";
import SearchAndFilterBar from "../components/SearchAndFilterBar";
import useSearch from "../context/useSearch";

const Header = () => {
  const { user, isLoggingOut, logout } = useContext(AuthContext);
  const location = useLocation();
  const {
    setSearchTerm,
    setSortBy,
    setSelectedCategories,
    selectedCategories,
    handleResetFilters,
  } = useSearch(); // Koristimo SearchContext za upravljanje pretragom i filtrima

  // Definisemo animaciju za FilterBar
  const searchBarVariants = {
    hidden: {
      opacity: 0,
      y: -15, // Blago podignuto gore
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeInOut", // Glatka tranzicija bez bounce efekta
      },
    },
  };

  return (
    <header className="d-flex flex-column p-2 bg-light">
      <div className="d-flex justify-content-between align-items-center">
        {/* Home link ?*/}
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
            <NavLink to="/login" className="btn btn-outline-primary me-2">
              Login
            </NavLink>
            <NavLink to="/register" className="btn btn-outline-success">
              Register
            </NavLink>
          </>
        )}
      </div>

      {/* Animirani SearchAndFilterBar samo ako smo na Home stranici */}
      {location.pathname === "/" && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={searchBarVariants}
          transition={{ duration: 0.5, ease: "easeInOut" }} // Trajanje i tip animacije
        >
          <SearchAndFilterBar
            onSearchChange={setSearchTerm} // Prosledjujemo funkciju za postavljanje pretrage
            onSortChange={setSortBy} // Prosledjujemo funkciju za postavljanje sortiranja
            onFilterChange={setSelectedCategories} // Prosledjujemo funkciju za postavljanje selektovanih kategorija
            onResetFilters={handleResetFilters} // Prosledjujemo funkciju za reset filtera
            selectedCategories={selectedCategories} // Prosledjujemo trenutno selektovane kategorije
          />
        </motion.div>
      )}
    </header>
  );
};

export default Header;
