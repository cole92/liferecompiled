import PropTypes from "prop-types";

const Spinner = ({ message = "Loading...", className = "", style = {} }) => {
  return (
    <div className="center-spinner">
      <div className={`spinner-border ${className}`} role="status" style={style}>
        <span className="visually-hidden">Loading...</span>
      </div>
      {message && <p className="text-center mt-3">{message}</p>}
    </div>
  );
};

// PropTypes validacija
Spinner.propTypes = {
  message: PropTypes.string,
  className: PropTypes.string, // Dodali smo podrsku za dodatne klase
  style: PropTypes.object, // Dodali smo podrsku za inline stilove
};

export default Spinner;