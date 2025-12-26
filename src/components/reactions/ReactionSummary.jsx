import PropTypes from "prop-types";
import ReactionIcon from "./ReactionIcon";

const ZERO_COUNTS = { idea: 0, hot: 0, powerup: 0 };

const ReactionSummary = ({ postId, locked, reactionCounts, onAfterToggle }) => {
  const safeCounts = {
    ...ZERO_COUNTS,
    ...(reactionCounts && typeof reactionCounts === "object"
      ? reactionCounts
      : {}),
  };

  return (
    <div className="flex gap-4 mt-2 ml-1 items-center">
      <ReactionIcon
        type="idea"
        postId={postId}
        locked={locked}
        count={safeCounts.idea}
        onAfterToggle={onAfterToggle}
      />

      <ReactionIcon
        type="hot"
        postId={postId}
        locked={locked}
        count={safeCounts.hot}
        onAfterToggle={onAfterToggle}
      />

      <ReactionIcon
        type="powerup"
        postId={postId}
        locked={locked}
        count={safeCounts.powerup}
        onAfterToggle={onAfterToggle}
      />
    </div>
  );
};

ReactionSummary.propTypes = {
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,

  // MVP: tolerantno (legacy postovi mogu faliti)
  reactionCounts: PropTypes.shape({
    idea: PropTypes.number,
    hot: PropTypes.number,
    powerup: PropTypes.number,
  }),

  onAfterToggle: PropTypes.func,
};

export default ReactionSummary;
