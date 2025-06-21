import PropTypes from "prop-types";

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

const PostFilterBar = ({ activeFilter, onFilterChange }) => {
  const filters = [
    {
      label: "Active",
      value: "active",
      className: "bg-blue-100 text-blue-800",
    },
    { label: "Locked", value: "locked", className: "bg-red-100 text-red-800" },
    { label: "All", value: "all", className: "bg-gray-200 text-gray-800" },
  ];

  return (
    <div className="flex gap-2 flex-wrap mb-4">
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
    </div>
  );
};

PostFilterBar.propTypes = {
  activeFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

export default PostFilterBar;
