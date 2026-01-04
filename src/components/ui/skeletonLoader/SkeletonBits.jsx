import PropTypes from "prop-types";

/**
 * @component SkeletonLine
 *
 * Horizontalna skeleton linija za simulaciju teksta.
 *
 * - Prop `as` definise element: "div" (default) ili "span" (inline bez nesting warninga)
 * - `w` i `h` primaju Tailwind klase za dimenzije
 * - Koristi animate-pulse za efekat disanja
 *
 * @param {string} w - sirina (Tailwind klasa, default "w-40")
 * @param {string} h - visina (Tailwind klasa, default "h-4")
 * @param {"div"|"span"} as - tip elementa
 * @returns {JSX.Element}
 */
export function SkeletonLine({ w = "w-40", h = "h-4", as = "div" }) {
  const Tag = as;
  return (
    <Tag
      className={`bg-zinc-800/70 rounded ${w} ${h} animate-pulse ${
        as === "span" ? "inline-block align-middle" : ""
      }`}
    />
  );
}

/**
 * @component SkeletonCircle
 *
 * Skeleton placeholder za kruzne elemente (npr. avatar).
 *
 * - Velicina definisana prop-om `size`
 * - Koristi animate-pulse za efekat disanja
 *
 * @param {number} size - velicina kruga u px (default 80)
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
