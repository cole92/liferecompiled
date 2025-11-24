import PropTypes from "prop-types";
import { motion } from "framer-motion";

/**
 * PostFilterBar komponenta
 *
 * Prikazuje dugmice za filtriranje postova u Dashboard-u:
 * - Active (otkljucani)
 * - Locked (zakljucani)
 * - All (svi postovi)
 *
 * @component
 * @param {string} activeFilter - Trenutno aktivni filter
 * @param {Function} onFilterChange - Callback za promenu filtera
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
      {/* Levo: filter dugmici – uvek zauzimaju prostor, samo fade on/off */}
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

      {/* Desno: search polje (uvek tu, ne skace) */}
      <div className="flex items-center gap-2 max-w-md flex-1 md:flex-none md:ml-auto">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search your posts by title..."
          className="border border-gray-600 bg-gray-800 text-white px-3 py-2 rounded w-full"
        />
        {hasSearch && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
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
