import PropTypes from "prop-types";
import ReactionIcon from "./ReactionIcon";
import { showInfoToast } from "../../utils/toastUtils";

const ZERO_COUNTS = { idea: 0, hot: 0, powerup: 0 };

// Session-only toast (shown once per tab/session)
const SELF_POWERUP_SESSION_KEY = "lr:selfPowerupBlockedShown";
const SELF_POWERUP_TOAST_ID = "reaction:powerup:self";

function maybeShowSelfPowerupToast() {
  try {
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(SELF_POWERUP_SESSION_KEY)) return;
      sessionStorage.setItem(SELF_POWERUP_SESSION_KEY, "1");
    }
  } catch {
    // ignore (privacy mode / blocked storage)
  }

  showInfoToast("You can't power up your own post 🙂", {
    toastId: SELF_POWERUP_TOAST_ID,
    autoClose: 1800,
  });
}

/**
 * @component ReactionSummary
 *
 * Compact reaction row (💡 / 🔥 / ⚡) for a post.
 * - Normalizes missing counts to zeros.
 * - Optionally blocks self-powerup (author reacting with ⚡ to own post).
 * - Delegates the actual toggle logic to <ReactionIcon />.
 */
const ReactionSummary = ({
  postId,
  locked,
  reactionCounts,
  onAfterToggle,
  userId, // current user id
  postAuthorId, // post owner id
  fetchActiveOnMount = true,
}) => {
  const safeCounts = {
    ...ZERO_COUNTS,
    ...(reactionCounts && typeof reactionCounts === "object"
      ? reactionCounts
      : {}),
  };

  // Block "powerup" when the current user is the post author
  const isSelf =
    !!userId && !!postAuthorId && String(userId) === String(postAuthorId);

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
          disabled={isSelf} // self-powerup block (soft)
          onBlockedClick={maybeShowSelfPowerupToast}
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

  // Current user id
  userId: PropTypes.string,

  // Post owner id
  postAuthorId: PropTypes.string,

  fetchActiveOnMount: PropTypes.bool,
};

export default ReactionSummary;
