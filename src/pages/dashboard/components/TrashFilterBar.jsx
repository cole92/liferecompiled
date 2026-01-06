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
    {
      label: "0-10 days",
      value: "0-10",
      className:
        "border-rose-500/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15",
    },
    {
      label: "11-20 days",
      value: "11-20",
      className:
        "border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
    },
    {
      label: "21-30 days",
      value: "21-30",
      className:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onFilterChange(f.value)}
          className={`inline-flex items-center rounded-full border px-3 py-1 text-sm transition
            focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
            focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
            hover:scale-105 ${f.className} ${
            filterRange === f.value ? "ring-1 ring-zinc-100/40" : ""
          }`}
        >
          {f.label}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onFilterChange(null)}
        className={`inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/40 px-3 py-1 text-sm text-zinc-200 transition
          hover:bg-zinc-900/40 hover:scale-105
          focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
          focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
            !filterRange ? "ring-1 ring-zinc-100/40" : ""
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
