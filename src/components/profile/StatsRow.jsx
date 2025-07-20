import PropTypes from "prop-types";

const StatsRow = ({ posts, reactions }) => {
  return (
    <div className="flex justify-center gap-6 text-sm text-gray-700 dark:text-gray-300 mt-2">
      <p className="text-sm text-gray-600 dark:text-gray-600">
        {posts} Posts · {reactions} Reactions
      </p>
    </div>
  );
};

StatsRow.propTypes = {
  posts: PropTypes.number.isRequired,
  reactions: PropTypes.number.isRequired,
};

export default StatsRow;
