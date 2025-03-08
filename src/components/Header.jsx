import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import LeftMenu from "./Left & Right Menu/LeftMenu";
import RightMenu from "./Left & Right Menu/RightMenu";
import SearchAndFilterBar from "../components/SearchAndFilterBar";
import useSearch from "../context/useSearch";

const Header = () => {
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
        {/* Levo dugme - otvara levi offcanvas meni */}
        <button
          className="btn btn-outline-primary"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#offcanvasLeft"
          aria-controls="offcanvasLeft"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Logo ili naslov aplikacije se ne prikazuje kada smo na Home strani */}
        {location.pathname !== "/" && <h1 className="fs-4 m-0">Blog App</h1>}

        {/* Desno dugme - otvara desni offcanvas meni */}
        <button
          className="btn btn-outline-secondary"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#offcanvasRight"
          aria-controls="offcanvasRight"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Offcanvas meniji */}
        <LeftMenu />
        <RightMenu />
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
