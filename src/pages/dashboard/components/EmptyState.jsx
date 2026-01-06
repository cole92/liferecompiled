import PropTypes from "prop-types";

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
