import { createPortal } from "react-dom";
import PropTypes from "prop-types";

/**
 * @component FilterPortal
 *
 * Small portal helper for rendering overlay-like UI into `#modal-root`.
 * Used to keep stacked UI (menus/filters/modals) out of normal layout flow
 * and above page content without z-index battles.
 *
 * Note: returns null if `modal-root` is missing (safe fallback).
 *
 * @param {React.ReactNode} children
 * @returns {React.ReactPortal|null}
 */
const FilterPortal = ({ children }) => {
  const el = document.getElementById("modal-root");
  if (!el) return null;
  return createPortal(children, el);
};

FilterPortal.propTypes = {
  children: PropTypes.node.isRequired,
};

export default FilterPortal;
