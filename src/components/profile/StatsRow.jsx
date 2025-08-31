import PropTypes from "prop-types";

/**
 * Komponenta koja prikazuje ukupan broj postova i reakcija korisnika.
 *
 * Tipican prikaz: `X Posts · Y Reactions`
 * Koristi se na Profile stranici i Dashboard statistikama.
 */

const StatsRow = ({ posts, reactions }) => {
  return (
    <div className="flex justify-center gap-6 text-sm text-gray-700 dark:text-gray-300 mt-2">
      <p className="text-sm text-gray-600 dark:text-gray-600 cursor-default select-none"
      title={`Total posts by this author`}
      >{posts} Posts</p>
      <p
        className="text-sm text-gray-600 dark:text-gray-600 cursor-default select-none"
        title={`Total reactions received (💡 + 🔥 + ⚡)`}
      >
        {reactions} Reactions
      </p>
    </div>
  );
};

StatsRow.propTypes = {
  posts: PropTypes.number.isRequired,
  reactions: PropTypes.number.isRequired,
};

export default StatsRow;
