import PropTypes from "prop-types";
import ReactionIcon from "./ReactionIcon";

/**
 * @component ReactionSummary
 * Prikazuje sve podrzane reakcije (💡 idea, 🔥 hot, ⚡ powerup) za dati post.
 *
 * MVP uloga:
 * - Ne racuna nista
 * - Ne cita Firestore
 * - Samo prosledjuje podatke ka ReactionIcon
 */

const ReactionSummary = ({ postId, locked, reactionCounts, onAfterToggle }) => {
  return (
    <div className="flex gap-4 mt-2 ml-1 items-center">
      <ReactionIcon
        type="idea"
        postId={postId}
        locked={locked}
        count={reactionCounts.idea}
        onAfterToggle={onAfterToggle}
      />

      <ReactionIcon
        type="hot"
        postId={postId}
        locked={locked}
        count={reactionCounts.hot}
        onAfterToggle={onAfterToggle}
      />

      <ReactionIcon
        type="powerup"
        postId={postId}
        locked={locked}
        count={reactionCounts.powerup}
        onAfterToggle={onAfterToggle}
      />
    </div>
  );
};

ReactionSummary.propTypes = {
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,

  // MVP: dolazi iz post.reactionCounts (normalizePostDoc)
  reactionCounts: PropTypes.shape({
    idea: PropTypes.number.isRequired,
    hot: PropTypes.number.isRequired,
    powerup: PropTypes.number.isRequired,
  }).isRequired,

  // PostDetails moze proslediti refetch handler
  onAfterToggle: PropTypes.func,
};

export default ReactionSummary;
