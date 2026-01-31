import PropTypes from "prop-types";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

function TopPostCard({ post }) {
  const navigate = useNavigate();
  const goToPost = () => navigate(`/post/${post.id}`);

  const previewText = useMemo(() => {
    const desc = post?.description?.trim();
    if (desc) return desc;

    const content = (post?.content ?? "").trim();
    if (!content) return "No description";
    return content.length > 160 ? content.slice(0, 160) + "..." : content;
  }, [post?.description, post?.content]);

  const tags = useMemo(() => {
    if (!Array.isArray(post?.tags)) return [];
    return post.tags
      .slice(0, 3)
      .map((t) => (typeof t === "string" ? t : (t?.text ?? t?.name ?? "tag")))
      .filter(Boolean);
  }, [post?.tags]);

  const category = (post?.category || "Uncategorized").trim();
  const reactionsTotal = post?.reactionsCount ?? 0;

  return (
    <button
      type="button"
      onClick={goToPost}
      className={[
        "ui-card w-full h-full p-4 text-left",
        "transition duration-200 hover:bg-zinc-900/40",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
      ].join(" ")}
      aria-label={`Open post: ${post?.title ?? "Untitled"}`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div>
          <h3 className="text-base font-semibold text-zinc-100 line-clamp-2">
            {post?.title ?? "Untitled"}
          </h3>

          <p className="mt-2 text-sm text-zinc-300 line-clamp-3 break-words">
            {previewText}
          </p>
        </div>

        {/* Footer pinned to bottom for consistent height */}
        <div className="mt-auto pt-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-[11px] text-zinc-300">
              {category}
            </span>

            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/30 px-2.5 py-1 text-[11px] text-zinc-400"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Total reactions</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-[12px] font-semibold text-zinc-100">
              👍 {reactionsTotal}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

TopPostCard.propTypes = {
  post: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    description: PropTypes.string,
    content: PropTypes.string,
    category: PropTypes.string,
    tags: PropTypes.arrayOf(
      PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          text: PropTypes.string,
          name: PropTypes.string,
        }),
      ]),
    ),
    reactionsCount: PropTypes.number,
  }).isRequired,
};

export default TopPostCard;
