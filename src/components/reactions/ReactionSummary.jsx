import PropTypes from "prop-types";
import ReactionIcon from "./ReactionIcon";
import { showInfoToast } from "../../utils/toastUtils";

const ZERO_COUNTS = { idea: 0, hot: 0, powerup: 0 };

// session-only toast (once per tab/session)
const SELF_POWERUP_SESSION_KEY = "lr:selfPowerupBlockedShown";
const SELF_POWERUP_TOAST_ID = "reaction:powerup:self";

function maybeShowSelfPowerupToast() {
  try {
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(SELF_POWERUP_SESSION_KEY)) return;
      sessionStorage.setItem(SELF_POWERUP_SESSION_KEY, "1");
    }
  } catch {
    // ignore
  }

  showInfoToast("You can't power up your own post 🙂", {
    toastId: SELF_POWERUP_TOAST_ID,
    autoClose: 1800,
  });
}

const ReactionSummary = ({
  postId,
  locked,
  reactionCounts,
  onAfterToggle,
  userId, // current user id
  postAuthorId, // NEW
  fetchActiveOnMount = true,
}) => {
  const safeCounts = {
    ...ZERO_COUNTS,
    ...(reactionCounts && typeof reactionCounts === "object"
      ? reactionCounts
      : {}),
  };

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
          disabled={isSelf} // NEW: self powerup block
          onBlockedClick={maybeShowSelfPowerupToast} // NEW
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

  // current user id
  userId: PropTypes.string,

  // NEW: author user id (post owner)
  postAuthorId: PropTypes.string,

  fetchActiveOnMount: PropTypes.bool,
};

export default ReactionSummary;
