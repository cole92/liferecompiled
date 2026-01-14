import PropTypes from "prop-types";
import ReactionIcon from "./ReactionIcon";

const ZERO_COUNTS = { idea: 0, hot: 0, powerup: 0 };

const ReactionSummary = ({
  postId,
  locked,
  reactionCounts,
  onAfterToggle,
  userId,
  fetchActiveOnMount = true,
}) => {
  const safeCounts = {
    ...ZERO_COUNTS,
    ...(reactionCounts && typeof reactionCounts === "object"
      ? reactionCounts
      : {}),
  };

  return (
    <div className="mt-2 ml-1 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <ReactionIcon
          type="idea"
          postId={postId}
          locked={locked}
          count={safeCounts.idea}
          onAfterToggle={onAfterToggle}
          userId={userId}
          fetchActiveOnMount={fetchActiveOnMount}
        />

        <ReactionIcon
          type="hot"
          postId={postId}
          locked={locked}
          count={safeCounts.hot}
          onAfterToggle={onAfterToggle}
          userId={userId}
          fetchActiveOnMount={fetchActiveOnMount}
        />
      </div>

      <div className="flex items-center">
        <ReactionIcon
          type="powerup"
          postId={postId}
          locked={locked}
          count={safeCounts.powerup}
          onAfterToggle={onAfterToggle}
          userId={userId}
          fetchActiveOnMount={fetchActiveOnMount}
        />
      </div>
    </div>
  );
};

ReactionSummary.propTypes = {
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,

  reactionCounts: PropTypes.shape({
    idea: PropTypes.number,
    hot: PropTypes.number,
    powerup: PropTypes.number,
  }),

  onAfterToggle: PropTypes.func,

  // Optional perf: pass current user id from parent so each icon does not subscribe to auth
  userId: PropTypes.string,

  // Optional perf: if false, icons will not fetch active state on mount (good for Home list)
  fetchActiveOnMount: PropTypes.bool,
};

export default ReactionSummary;
