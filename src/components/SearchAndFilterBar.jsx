import { useState } from "react";
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
}) => {
  // Lokalna stanja unutar ove komponente (ne uticu na globalni context)
  const [localSearchTerm, setLocalSearchTerm] = useState(""); // Lokalni unos pretrage
  const [localSortBy, setLocalSortBy] = useState("newest"); // Lokalno sortiranje
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Kontrolise prikaz filter panela

  //  Funkcija koja otvara/zatvara panel sa filterima.
  const toggleFilterPanel = () => {
    setIsFilterOpen(!isFilterOpen);
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
            <option value="oldest">Oldest First</option>
            <option value="comments">Most Comments</option>
            <option value="likes">Most Likes</option>
          </select>
          {/* Filter Button - otvara/zatvara filter panel */}
          <button
            onClick={toggleFilterPanel}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Filters
          </button>
        </div>
        {/* Filter Panel - prikazuje dodatne opcije filtera */}
        {isFilterOpen && (
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-lg p-4 transition-transform duration-300">
            <h2 className="text-lg font-bold">Filter Options</h2>
            {/* ✅ Checkbox opcije za kategorije */}
            <h3 className="text-md font-semibold mt-4">Categories</h3>
            <div className="mt-2">
              {validCategories.map((categoryItem) => (
                <label
                  key={categoryItem}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    value={categoryItem}
                    checked={selectedCategories.includes(categoryItem)}
                    onChange={handleCategoryChange}
                  />
                  <span>{categoryItem}</span>
                </label>
              ))}
            </div>
            {/* Reset Button - resetuje sve filtere */}
            <button
              onClick={onResetFilters}
              className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Reset
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
          </div>
        )}
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
};

export default SearchAndFilterBar;
