import PropTypes from "prop-types";
import { FiFileText, FiZap } from "react-icons/fi";
import { SkeletonLine } from "../ui/skeletonLoader/SkeletonBits";

/**
 * @component StatCard
 *
 * Small stat tile used by `StatsRow` when `variant="cards"`.
 * - Uses a skeleton placeholder to avoid layout shift while loading.
 * - Accepts an `icon` component for quick visual scanning.
 *
 * @param {string} label
 * @param {number|string=} value
 * @param {boolean=} loading
 * @param {React.ElementType=} icon
 * @returns {JSX.Element}
 */
const StatCard = ({ label, value, loading, icon: Icon }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/20 p-4">
      {/* Subtle highlight to keep cards from feeling flat without adding noise. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_10%_0%,rgba(56,189,248,0.08),transparent_60%)]" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium text-zinc-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-zinc-100">
            {loading ? <SkeletonLine as="span" w="w-16" h="h-6" /> : value}
          </div>
        </div>

        {Icon ? <Icon className="h-5 w-5 text-zinc-600" /> : null}
      </div>
    </div>
  );
};

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool,
  icon: PropTypes.elementType,
};

/**
 * @component StatsRow
 *
 * Reusable profile stats renderer with multiple visual density modes:
 * - `inline`: minimal text row (default)
 * - `pills`: compact bordered blocks (mobile-friendly)
 * - `cards`: richer tiles with icons (dashboard feel)
 *
 * Notes:
 * - `align` only affects horizontal justification (center/start).
 * - Skeletons are used to keep the layout stable while async stats load.
 *
 * @param {number=} posts
 * @param {number=} reactions
 * @param {boolean=} loadingPosts
 * @param {boolean=} loadingReactions
 * @param {"inline"|"pills"|"cards"=} variant
 * @param {"center"|"start"=} align
 * @returns {JSX.Element}
 */
const StatsRow = ({
  posts,
  reactions,
  loadingPosts,
  loadingReactions,
  variant = "inline",
  align = "center",
}) => {
  // Keep layout decisions local so callers only pass intent (variant/align).
  const justify = align === "start" ? "justify-start" : "justify-center";

  if (variant === "cards") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Posts"
          value={posts ?? 0}
          loading={loadingPosts}
          icon={FiFileText}
        />
        <StatCard
          label="Reactions"
          value={reactions ?? 0}
          loading={loadingReactions}
          icon={FiZap}
        />
      </div>
    );
  }

  if (variant === "pills") {
    return (
      <div className={`flex flex-wrap items-stretch gap-3 ${justify}`}>
        <div className="min-w-[120px] rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2.5">
          <div className="text-[11px] font-medium text-zinc-500">Posts</div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {loadingPosts ? <SkeletonLine as="span" w="w-14" h="h-5" /> : posts}
          </div>
        </div>

        <div className="min-w-[120px] rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2.5">
          <div className="text-[11px] font-medium text-zinc-500">Reactions</div>
          <div className="mt-1 text-lg font-semibold text-zinc-100">
            {loadingReactions ? (
              <SkeletonLine as="span" w="w-16" h="h-5" />
            ) : (
              reactions
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-2 flex gap-6 text-sm text-zinc-300 ${justify}`}>
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
        title="Total reactions received (idea + hot + powerup)"
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
  variant: PropTypes.oneOf(["inline", "pills", "cards"]),
  align: PropTypes.oneOf(["center", "start"]),
};

export default StatsRow;
