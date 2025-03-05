import { useLocation } from "react-router-dom";
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

         {/* Logo ili naslov aplikacije */}
        <h1 className="fs-4 m-0">Blog App</h1>

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

      {/* Prikazujemo SearchAndFilterBar SAMO na Home stranici */}
      {location.pathname === "/" && (
        <SearchAndFilterBar
          onSearchChange={setSearchTerm} // Prosledjujemo funkciju za postavljanje pretrage
          onSortChange={setSortBy} // Prosledjujemo funkciju za postavljanje sortiranja
          onFilterChange={setSelectedCategories} // Prosledjujemo funkciju za postavljanje selektovanih kategorija
          onResetFilters={handleResetFilters} // Prosledjujemo funkciju za reset filtera
          selectedCategories={selectedCategories} // Prosledjujemo trenutno selektovane kategorije
        />
      )}
    </header>
  );
};

export default Header;
