import PropTypes from "prop-types";

/**
 * @component EmptyState
 *
 * Small reusable empty-state block for list pages.
 * Keeps spacing and typography consistent across dashboards/feeds.
 *
 * @param {{ message?: string }} props
 * @returns {JSX.Element}
 */
const EmptyState = ({ message = "" }) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
      <p className="text-center text-sm">{message}</p>
    </div>
  );
};

EmptyState.propTypes = {
  message: PropTypes.string,
};

export default EmptyState;
