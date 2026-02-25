import PropTypes from "prop-types";
import SkeletonCard from "./SkeletonCard";

/**
 * @component SkeletonGrid
 *
 * Grid placeholder displayed while a list of posts is loading.
 *
 * - Renders multiple <SkeletonCard /> elements in a responsive layout
 * - Prop `count` controls how many skeleton cards are rendered (default 3)
 * - Uses CSS Grid to mirror the layout of real post cards
 *
 * @param {number} count - Number of skeleton cards to render (default 3)
 * @returns {JSX.Element}
 */
export default function SkeletonGrid({ count = 3 }) {
  return (
    <div className="grid gap-4 mt-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
      {Array.from({ length: count }).map((_, i) => (
        // Index is safe here because skeleton items are static and non-interactive
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

SkeletonGrid.propTypes = {
  count: PropTypes.number, // Optional, defaults to 3
};
