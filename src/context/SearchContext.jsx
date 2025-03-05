import { createContext, useState } from "react";
import PropTypes from "prop-types";

// Kontekst koji sluzi za pretragu, sortiranje i filtriranje postova.
const SearchContext = createContext();

/**
 * SearchProvider komponenta – omotava aplikaciju i omogucava deljenje stanja
 * za pretragu, sortiranje i filtere izmedju vise komponenti.
 */

export const SearchProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState(""); // Stanje za unos pretrage
  const [sortBy, setSortBy] = useState("newest"); // Stanje za sortiranje (default: najnoviji postovi)
  const [selectedCategories, setSelectedCategories] = useState([]); // Stanje za odabrane kategorije

  // Metoda za reset svih stanja na pocetne vrednosti
  const handleResetFilters = () => {
    setSearchTerm("");
    setSortBy("newest");
    setSelectedCategories([]);
  };

  return (
    /**
     * SearchContext.Provider – omoguxava svim komponentama unutar njega
     * da pristupe i azuriraju podatke o pretrazi, sortiranju i filtriranju.
     */
    <SearchContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        sortBy,
        setSortBy,
        selectedCategories,
        setSelectedCategories,
        handleResetFilters,
      }}
    >
      {children} {/* Omogucava da svi potomci ovog providera koriste kontekst */}
    </SearchContext.Provider>
  );
};

SearchProvider.propTypes = {
  children: PropTypes.node.isRequired, // `children` mora biti JSX element
};

export { SearchContext };
