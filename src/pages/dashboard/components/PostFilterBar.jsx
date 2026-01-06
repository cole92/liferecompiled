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
      className:
        "border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
    },
    {
      label: "Locked",
      value: "locked",
      className:
        "border-rose-500/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15",
    },
    {
      label: "All",
      value: "all",
      className:
        "border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/40",
    },
  ];

  const hasSearch = searchTerm.trim().length > 0;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {/* Filter dugmici: fade-out i disable u search modu da bi se vizuelno prikazao prelaz u search mod */}
      <motion.div
        initial={false}
        animate={{ opacity: hasSearch ? 0 : 1, y: hasSearch ? -4 : 0 }}
        transition={{ duration: 0.2 }}
        className={`flex flex-wrap gap-2 ${
          hasSearch ? "pointer-events-none" : ""
        }`}
        aria-hidden={hasSearch}
      >
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onFilterChange(f.value)}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm transition
              focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
              focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
              hover:scale-105 ${f.className} ${
              activeFilter === f.value ? "ring-1 ring-zinc-100/40" : ""
            }`}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Search polje: uvek prisutno desno da bi se izbegao layout jump pri ulasku/izlasku iz search moda */}
      <div className="flex flex-1 items-center gap-2 max-w-md md:flex-none md:ml-auto">
        <input
          id="my-posts-search"
          name="myPostsSearch"
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search your posts by title..."
          aria-label="Search your posts by title"
          autoComplete="off"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-zinc-100 placeholder:text-zinc-500
            focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400
            focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        />
        {hasSearch && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="text-sm text-zinc-300 underline hover:text-zinc-100"
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
