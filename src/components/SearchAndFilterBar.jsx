import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropTypes from "prop-types";
import { validCategories } from "../constants/postCategories"; // Predefinisane kategorije za filtere

/**
 * SearchAndFilterBar - komponenta koja omogucava pretragu, sortiranje i filtriranje postova.
 * Koristi propse za azuriranje globalnog stanja iz `SearchContext`.
 */

const SearchAndFilterBar = ({
  onSearchChange,
  onSortChange,
  onFilterChange,
  onResetFilters,
  selectedCategories,
  sortBy,
}) => {
  // Lokalna stanja unutar ove komponente (ne uticu na globalni context)
  const [localSearchTerm, setLocalSearchTerm] = useState(""); // Lokalni unos pretrage
  const [localSortBy, setLocalSortBy] = useState("newest"); // Lokalno sortiranje
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Kontrolise prikaz filter panela

  const hasActiveCategory =
    Array.isArray(selectedCategories) && selectedCategories.length === 1;

  useEffect(() => {
    if (hasActiveCategory && localSortBy === "oldest") {
      setLocalSortBy("newest");
      onSortChange("newest");
    }
  }, [hasActiveCategory, localSortBy, onSortChange]);

  useEffect(() => {
    // Drzi lokalni dropdown uskladjen sa globalnim sortBy
    if (sortBy === "oldest" || sortBy === "newest") {
      setLocalSortBy(sortBy);
    } else {
      setLocalSortBy("newest");
    }
  }, [sortBy]);

  //  Funkcija koja otvara/zatvara panel sa filterima.
  const toggleFilterPanel = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  // Definisemo animaciju za SearchAndFilterBar
  const filterPanelVariants = {
    hidden: {
      opacity: 0,
      x: 50, // Blago pomeren udesno na startu
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: "easeInOut", // Glatka i ravnomerna tranzicija
      },
    },
    exit: {
      opacity: 0,
      x: 50, // Odlazi blago udesno
      transition: {
        duration: 0.5, // 📌 Sporije zatvaranje
        ease: "easeInOut",
      },
    },
  };

  /**
   * - Funkcija koja azurira selektovane kategorije pri promeni checkbox-a.
   * - Kada korisnik cekira opciju, dodaje se u listu `selectedCategories`.
   * - Kada korisnik odcekira opciju, uklanja se iz liste.
   * - Azurirani podaci se prosleđuju kroz `onFilterChange`, što menja stanje u `SearchContext`.
   */

  const handleCategoryChange = (event) => {
    const { value, checked } = event.target; // Dobijamo vrednost checkbox-a i njegov status
    // Kreiramo novi niz selektovanih kategorija
    const newCategories = checked
      ? [...selectedCategories, value] // Dodajemo novu kategoriju ako je selektovana
      : selectedCategories.filter((category) => category !== value); // Uklanjamo kategoriju ako nije selektovana

    onFilterChange(newCategories); // Prosledjujemo azurirani niz nazad u `SearchContext`
  };

  /**
   * - Funkcija koja azurira pretragu pri svakom unosu korisnika.
   * - Azurira lokalno stanje `localSearchTerm`.
   * - Prosledjuje unos u `onSearchChange`, cime se pretraga reflektuje u `SearchContext`.
   */

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
    onSearchChange(value);
  };

  /**
   * - Funkcija koja azurira sortiranje kada korisnik promeni opciju u dropdown meniju.
   * - Azurira lokalno stanje `localSortBy`.
   * - Prosleđuje novu vrednost u `onSortChange`, cime azurira stanje u `SearchContext`.
   */

  const handleSortChange = (e) => {
    const value = e.target.value;

    // Ako je aktivna kategorija, ne dozvoli "oldest" u v1
    if (hasActiveCategory && value === "oldest") {
      return;
    }

    setLocalSortBy(value);
    onSortChange(value);
  };

  return (
    <div>
      <div className="p-4">
        {/* Search, Sort i Filter sekcija */}
        <div className="flex items-center gap-4 bg-white p-4 z-10 rounded-lg shadow-md sticky top-0">
          {/* Search Input - polje za unos pretrage */}
          <input
            type="text"
            placeholder="Search posts..."
            value={localSearchTerm}
            onChange={handleSearchChange}
            className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* Sort Dropdown - biranje nacina sortiranja */}
          <select
            value={localSortBy}
            onChange={handleSortChange}
            className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest" disabled={hasActiveCategory}>
              Oldest First
            </option>
          </select>
          {/* Filter Button - otvara/zatvara filter panel */}
          <button
            onClick={toggleFilterPanel}
            className={`p-2 rounded-lg text-white ${
              selectedCategories.length > 0 ? "bg-blue-600" : "bg-blue-500"
            }`}
          >
            Filters{" "}
            {selectedCategories.length > 0 && `(${selectedCategories.length})`}{" "}
            {/* Prikaz broja selektovanih filtera*/}
          </button>
        </div>
        {/* Filter Panel sa animacijom */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={filterPanelVariants}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 right-0 h-full w-80 bg-white shadow-lg p-4"
            >
              <h2 className="text-lg font-bold">Filter Options</h2>
              {/* ✅ Checkbox opcije za kategorije */}
              <h3 className="text-md font-semibold mt-4">Categories</h3>
              <div className="mt-2">
                {validCategories.map((categoryItem) => {
                  const isActive = selectedCategories.includes(categoryItem);
                  const isDisabled = hasActiveCategory && !isActive;

                  return (
                    <label
                      key={categoryItem}
                      className={`flex items-center space-x-2 ${
                        isDisabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={categoryItem}
                        checked={isActive}
                        onChange={handleCategoryChange}
                        disabled={isDisabled}
                      />
                      <span>{categoryItem}</span>
                    </label>
                  );
                })}

                {hasActiveCategory && (
                  <p className="mt-2 text-sm text-gray-500 italic text-center">
                    Single category mode (v1): while a category is active, other
                    categories and the &quot;Oldest&quot; sort option are
                    disabled. Clear the filter to change selection.
                  </p>
                )}
              </div>
              {/* Reset Button - resetuje sve filtere */}
              <button
                onClick={onResetFilters}
                className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Clear
              </button>
              <div>
                {/* Close Button - zatvara filter panel */}
                <button
                  onClick={toggleFilterPanel}
                  className="mt-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

SearchAndFilterBar.propTypes = {
  onSearchChange: PropTypes.func.isRequired, // Mora biti funkcija
  onSortChange: PropTypes.func.isRequired, // Mora biti funkcija
  onFilterChange: PropTypes.func.isRequired, // Mora biti funkcija
  onResetFilters: PropTypes.func.isRequired, // Mora biti funkcija
  selectedCategories: PropTypes.arrayOf(PropTypes.string).isRequired, // Mora biti niz stringova
  sortBy: PropTypes.oneOf(["newest", "oldest"]).isRequired,
};

export default SearchAndFilterBar;
