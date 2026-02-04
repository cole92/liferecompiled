import PropTypes from "prop-types";
import { SkeletonLine } from "../ui/skeletonLoader/SkeletonBits";

const StatCard = ({ label, value, loading }) => {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/30 p-4 ring-1 ring-zinc-100/5">
      <div className="text-[11px] font-medium text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
        {loading ? <SkeletonLine as="span" w="w-16" h="h-6" /> : value}
      </div>
    </div>
  );
};

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loading: PropTypes.bool,
};

const StatsRow = ({
  posts,
  reactions,
  loadingPosts,
  loadingReactions,
  variant = "inline",
  align = "center",
}) => {
  const justify = align === "start" ? "justify-start" : "justify-center";

  if (variant === "cards") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Posts" value={posts ?? 0} loading={loadingPosts} />
        <StatCard
          label="Reactions"
          value={reactions ?? 0}
          loading={loadingReactions}
        />
      </div>
    );
  }

  if (variant === "pills") {
    return (
      <div className={`flex flex-wrap items-stretch gap-3 ${justify}`}>
        <div className="min-w-[120px] rounded-xl border border-zinc-800/80 bg-zinc-950/30 px-3 py-2.5 ring-1 ring-zinc-100/5">
          <div className="text-[11px] font-medium text-zinc-500">Posts</div>
          <div className="mt-1 text-lg font-semibold text-zinc-100 tabular-nums">
            {loadingPosts ? <SkeletonLine as="span" w="w-14" h="h-5" /> : posts}
          </div>
        </div>

        <div className="min-w-[120px] rounded-xl border border-zinc-800/80 bg-zinc-950/30 px-3 py-2.5 ring-1 ring-zinc-100/5">
          <div className="text-[11px] font-medium text-zinc-500">Reactions</div>
          <div className="mt-1 text-lg font-semibold text-zinc-100 tabular-nums">
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
