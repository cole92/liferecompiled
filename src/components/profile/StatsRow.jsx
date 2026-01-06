import PropTypes from "prop-types";
import { SkeletonLine } from "../ui/skeletonLoader/SkeletonBits";

/**
 * @component StatsRow
 *
 * Kratak prikaz brojki za korisnika (Posts i Reactions).
 *
 * - Koristi se na Profile stranici i u Dashboard statistikama
 * - Tipican prikaz: "X Posts · Y Reactions"
 * - Ako su brojevi u stanju loadinga, prikazuje skeleton linije umesto flicker "0"
 *
 * @param {number} posts - ukupan broj postova
 * @param {number} reactions - ukupan broj reakcija
 * @param {boolean} loadingPosts - prikaz skeletona za Posts
 * @param {boolean} loadingReactions - prikaz skeletona za Reactions
 * @returns {JSX.Element}
 */

const StatsRow = ({ posts, reactions, loadingPosts, loadingReactions }) => {
  return (
    <div className="mt-2 flex justify-center gap-6 text-sm text-zinc-300">
      <p
        className="cursor-default select-none text-zinc-400"
        title="Total posts by this author"
      >
        {loadingPosts ? (
          <SkeletonLine as="span" w="w-20" h="h-4" />
        ) : (
          `${posts} Posts`
        )}
      </p>

      <p
        className="cursor-default select-none text-zinc-400"
        title="Total reactions received (💡 + 🔥 + ⚡)"
      >
        {loadingReactions ? (
          <SkeletonLine as="span" w="w-24" h="h-4" />
        ) : (
          `${reactions} Reactions`
        )}
      </p>
    </div>
  );
};

StatsRow.propTypes = {
  posts: PropTypes.number,
  reactions: PropTypes.number,
  loadingPosts: PropTypes.bool,
  loadingReactions: PropTypes.bool,
};

export default StatsRow;
