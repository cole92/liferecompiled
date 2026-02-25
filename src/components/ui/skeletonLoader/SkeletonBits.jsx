import PropTypes from "prop-types";

/**
 * @component SkeletonLine
 *
 * Horizontal skeleton placeholder used to simulate text content.
 *
 * - Prop `as` allows rendering as "div" (default) or "span"
 * - Enables inline skeleton usage without invalid DOM nesting warnings
 * - `w` and `h` accept Tailwind utility classes for width and height
 * - Uses `animate-pulse` for subtle breathing effect
 *
 * @param {string} w - Tailwind width class (default "w-40")
 * @param {string} h - Tailwind height class (default "h-4")
 * @param {"div"|"span"} as - Element type to render
 * @returns {JSX.Element}
 */
export function SkeletonLine({ w = "w-40", h = "h-4", as = "div" }) {
  const Tag = as;

  return (
    <Tag
      className={`bg-zinc-800/70 rounded ${w} ${h} animate-pulse ${
        // Inline mode: ensure proper layout alignment when rendered as <span>
        as === "span" ? "inline-block align-middle" : ""
      }`}
    />
  );
}

/**
 * @component SkeletonCircle
 *
 * Circular skeleton placeholder (e.g. avatar).
 *
 * - Size is controlled via numeric `size` prop (in pixels)
 * - Uses inline style because Tailwind does not support dynamic px values
 * - Uses `animate-pulse` for subtle breathing effect
 *
 * @param {number} size - Circle diameter in pixels (default 80)
 * @returns {JSX.Element}
 */
export function SkeletonCircle({ size = 80 }) {
  return (
    <div
      className="bg-zinc-800/70 rounded-full animate-pulse"
      style={{ width: size, height: size }}
    />
  );
}

SkeletonLine.propTypes = {
  w: PropTypes.string,
  h: PropTypes.string,
  as: PropTypes.oneOf(["div", "span"]),
};

SkeletonCircle.propTypes = {
  size: PropTypes.number,
};
