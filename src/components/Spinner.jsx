import PropTypes from "prop-types";

/**
 * @component Spinner
 *
 * Small loading indicator with an optional label.
 *
 * - Uses a CSS border spinner (Tailwind) for a lightweight, dependency-free loader.
 * - `message` can be hidden by passing an empty string or null.
 * - `className` and `style` are applied to the spinner circle (not the wrapper),
 *   so you can change size, border thickness, etc.
 *
 * Accessibility:
 * - Uses `role="status"` + `aria-live="polite"` to announce loading changes.
 * - Includes a screen-reader-only "Loading..." label.
 *
 * @param {object} props
 * @param {string} [props.message="Loading..."] - Optional text displayed under the spinner.
 * @param {string} [props.className=""] - Extra classes for the spinner circle.
 * @param {object} [props.style={}] - Inline styles for the spinner circle.
 * @returns {JSX.Element}
 */
const Spinner = ({ message = "Loading...", className = "", style = {} }) => {
  const srLabel =
    typeof message === "string" && message.trim() ? message : "Loading...";

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        role="status"
        aria-live="polite"
        aria-label={srLabel}
        className={`h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-sky-400 ${className}`}
        style={style}
      >
        <span className="sr-only">{srLabel}</span>
      </div>

      {message ? (
        <p className="mt-3 text-center text-sm text-zinc-300">{message}</p>
      ) : null}
    </div>
  );
};

Spinner.propTypes = {
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Spinner;
