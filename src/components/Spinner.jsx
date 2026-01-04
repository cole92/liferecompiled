import PropTypes from "prop-types";

const Spinner = ({ message = "Loading...", className = "", style = {} }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        role="status"
        aria-live="polite"
        className={`h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-400 ${className}`}
        style={style}
      >
        <span className="sr-only">Loading...</span>
      </div>

      {message && (
        <p className="mt-3 text-center text-sm text-zinc-300">{message}</p>
      )}
    </div>
  );
};

Spinner.propTypes = {
  message: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Spinner;
