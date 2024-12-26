import PropTypes from "prop-types";

const Spinner = ({ message = "Loading..." }) => {
  return (
    <div className="center-spinner">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="text-center mt-3">{message}</p>
    </div>
  );
};

// PropTypes validacija za `message`
Spinner.propTypes = {
  message: PropTypes.string, // `message` mora biti string
};

export default Spinner;
