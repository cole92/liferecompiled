import { useContext } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

import { AuthContext } from "../context/AuthContext";
import useSearch from "../context/useSearch";

import AvatarDropdown from "./AvatarDropdown";
import SearchAndFilterBar from "../components/SearchAndFilterBar";

const Header = () => {
  const { user, isLoggingOut, logout } = useContext(AuthContext); // Dobijamo autentifikovanog korisnika i logout funkciju
  const location = useLocation(); // React Router hook za detekciju aktivne rute

  const {
    setSearchTerm,
    setSortBy,
    setSelectedCategories,
    selectedCategories,
    handleResetFilters,
  } = useSearch(); // SearchContext: kontrola globalne pretrage i filtera

  // Definisemo animaciju za prikaz SearchAndFilterBar komponente
  const searchBarVariants = {
    hidden: {
      opacity: 0,
      y: -15,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeInOut",
      },
    },
  };

  return (
    <header className="d-flex flex-column p-2 bg-light">
      <div className="d-flex justify-content-between align-items-center">
        {/* Link ka Home stranici (uvek vidljiv) */}
        <NavLink
          to="/"
          className="navbar-brand text-dark text-decoration-none fs-4"
        >
          Blog App
        </NavLink>

        {/* Avatar meni ako je korisnik ulogovan, ili dugmici za Login/Register ako nije */}
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

      {/* Prikaz animiranog SearchAndFilterBar samo na Home stranici */}
      {location.pathname === "/" && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={searchBarVariants}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <SearchAndFilterBar
            onSearchChange={setSearchTerm} // Setovanje vrednosti za pretragu
            onSortChange={setSortBy} // Setovanje kriterijuma za sortiranje
            onFilterChange={setSelectedCategories} // Biranje kategorija za filtriranje
            onResetFilters={handleResetFilters} // Resetovanje svih filtera
            selectedCategories={selectedCategories} // Trenutno selektovane kategorije
          />
        </motion.div>
      )}
    </header>
  );
};
export default Header;
