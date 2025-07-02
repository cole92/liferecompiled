import PropTypes from "prop-types";
import ReactionIcon from "./ReactionIcon";

/**
 * @component ReactionSummary
 * Prikazuje sve podrzane reakcije (💡 idea, 🔥 hot, ⚡ powerup) za dati post.
 *
 * @param {string} postId - ID posta za koji se prikazuju reakcije.
 * @param {boolean} [locked] - Ako je post zakljucan, reakcije su onemogucene.
 *
 * @returns {JSX.Element} Grupa dugmica za reakcije.
 */


const ReactionSummary = ({ postId, locked }) => {
  return (
    <div className="flex gap-4 mt-2 ml-1 items-center">
      <ReactionIcon type="idea" postId={postId} locked={locked} />
      <ReactionIcon type="hot" postId={postId} locked={locked} />
      <ReactionIcon type="powerup" postId={postId} locked={locked} />
    </div>
  );
};

ReactionSummary.propTypes = {
  postId: PropTypes.string.isRequired,
  locked: PropTypes.bool,
};

export default ReactionSummary;