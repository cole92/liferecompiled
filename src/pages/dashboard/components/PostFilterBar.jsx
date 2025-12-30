import PropTypes from "prop-types";
import { motion } from "framer-motion";

/**
 * @component PostFilterBar
 *
 * UI traka za filtriranje i pretragu u MyPosts stranici.
 *
 * Namena:
 * - Prikazuje filter dugmice (Active / Locked / All) za normalni mod
 * - Prikazuje search input za server-side prefix pretragu (title_lc)
 * - Implementira “search mode” gde filter dugmici vizuelno blede i postaju neaktivni
 * - Obezbedjuje da se layout ne pomera: search polje je uvek prisutno desno
 *
 * UX ponasanje:
 * - Kada `searchTerm.trim().length > 0`:
 *   - filter dugmici imaju fade-out (`opacity:0`, `y:-4`)
 *   - `pointer-events-none` i `aria-hidden=true`
 *   - prikazani su samo rezultati search moda (filteri se ignorisu)
 *
 * - Kada je `searchTerm` prazan:
 *   - filter dugmici su ponovo aktivni
 *   - prikaz vraca u normalni mod (Active / Locked / All)
 *
 * Props:
 * @param {string} activeFilter - Trenutno aktivni filter u normal mod-u
 * @param {Function} onFilterChange - Callback za promenu filtera
 * @param {string} searchTerm - Tekst pretrage (kontrolisano stanje)
 * @param {Function} onSearchChange - Callback prilikom promene search input-a
 *
 * @returns {JSX.Element}
 */

const PostFilterBar = ({
  activeFilter,
  onFilterChange,
  searchTerm,
  onSearchChange,
}) => {
  const filters = [
    {
      label: "Active",
      value: "active",
      className: "bg-blue-100 text-blue-800",
    },
    { label: "Locked", value: "locked", className: "bg-red-100 text-red-800" },
    { label: "All", value: "all", className: "bg-gray-200 text-gray-800" },
  ];

  const hasSearch = searchTerm.trim().length > 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      {/* Filter dugmici: fade-out i disable u search modu da bi se vizuelno prikazao prelaz u search mod */}
      <motion.div
        initial={false}
        animate={{ opacity: hasSearch ? 0 : 1, y: hasSearch ? -4 : 0 }}
        transition={{ duration: 0.2 }}
        className={`flex gap-2 flex-wrap ${
          hasSearch ? "pointer-events-none" : ""
        }`}
        aria-hidden={hasSearch}
      >
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-3 py-1 rounded-full text-sm transition hover:scale-105 ${
              f.className
            } ${
              activeFilter === f.value
                ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-black"
                : ""
            }`}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Search polje: uvek prisutno desno da bi se izbegao layout jump pri ulasku/izlasku iz search moda */}
      <div className="flex items-center gap-2 max-w-md flex-1 md:flex-none md:ml-auto">
        <input
          id="my-posts-search"
          name="myPostsSearch"
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search your posts by title..."
          aria-label="Search your posts by title"
          autoComplete="off"
          className="border border-gray-600 bg-gray-800 text-white px-3 py-2 rounded w-full"
        />
        {hasSearch && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="text-sm underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

PostFilterBar.propTypes = {
  activeFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  searchTerm: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
};
export default PostFilterBar;
