import PropTypes from "prop-types";

/**
 * Filter dugmad za Trash sekciju
 *
 * - Prikazuje 3 raspona po broju dana do brisanja
 * - Poziva onFilterChange sa izabranom vrednoscu
 * - Oznacava trenutno aktivan filter
 */

const TrashFilterBar = ({ filterRange, onFilterChange }) => {
  const filters = [
    { label: "0-10 days", value: "0-10", className: "bg-red-100 text-red-800" },
    {
      label: "11-20 days",
      value: "11-20",
      className: "bg-yellow-100 text-yellow-800",
    },
    {
      label: "21-30 days",
      value: "21-30",
      className: "bg-green-100 text-green-800",
    },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onFilterChange(f.value)}
          className={`px-3 py-1 rounded-full text-sm transition hover:scale-105 ${
            f.className
          } ${
            filterRange === f.value
              ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-white"
              : ""
          }`}
        >
          {f.label}
        </button>
      ))}
      <button
        onClick={() => onFilterChange(null)}
        className={`px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-800 hover:scale-105 transition ${
          !filterRange ? "ring-2 ring-black ring-offset-2" : ""
        }`}
      >
        Reset
      </button>
    </div>
  );
};

TrashFilterBar.propTypes = {
  filterRange: PropTypes.string,
  onFilterChange: PropTypes.func.isRequired,
};

export default TrashFilterBar;
