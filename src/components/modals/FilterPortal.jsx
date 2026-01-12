import { createPortal } from "react-dom";
import PropTypes from "prop-types";

const FilterPortal = ({ children }) => {
  const el = document.getElementById("modal-root");
  if (!el) return null;
  return createPortal(children, el);
};

FilterPortal.propTypes = {
  children: PropTypes.node.isRequired,
};

export default FilterPortal;
