import PropTypes from "prop-types";
import SkeletonCard from "./SkeletonCard";

/**
 * @component SkeletonGrid
 *
 * Grid placeholder tokom ucitavanja liste postova.
 *
 * - Rederuje vise <SkeletonCard /> elemenata u responsive mrezi
 * - Prop `count` odredjuje koliko skeleton kartica se prikazuje (default 3)
 * - Koristi CSS grid da imitira raspored pravih kartica
 *
 * @param {number} count - broj skeleton kartica (default 3)
 * @returns {JSX.Element}
 */

export default function SkeletonGrid({ count = 3 }) {
  return (
    <div className="grid gap-4 mt-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

SkeletonGrid.propTypes = {
  count: PropTypes.number, // opciono, default je 3
};
