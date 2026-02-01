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

  const shorten = (s, n = 22) => {
    const str = String(s ?? "");
    if (!str) return "";
    return str.length > n ? str.slice(0, n - 1) + "…" : str;
  };

  return (
    <button
      type="button"
      onClick={goToPost}
      className={[
        "ui-card w-full h-full p-4 text-left overflow-hidden",
        "transition duration-200 hover:bg-zinc-900/40",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
      ].join(" ")}
      aria-label={`Open post: ${post?.title ?? "Untitled"}`}
    >
      <div className="flex h-full min-w-0 flex-col">
        {/* Header */}
        <div className="min-w-0">
          <h3
            className={[
              "min-w-0 text-base font-semibold text-zinc-100",
              "line-clamp-2",
              "[overflow-wrap:anywhere]",
            ].join(" ")}
            title={post?.title ?? "Untitled"}
          >
            {post?.title ?? "Untitled"}
          </h3>

          <p
            className={[
              "mt-2 min-w-0 text-sm text-zinc-300",
              "line-clamp-3",
              "[overflow-wrap:anywhere]",
            ].join(" ")}
          >
            {previewText}
          </p>
        </div>

        {/* Footer pinned */}
        <div className="mt-auto pt-4 min-w-0">
          {/* Stable pills area */}
          <div className="flex flex-wrap gap-2 max-h-[56px] overflow-hidden min-w-0">
            <span
              className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-[11px] text-zinc-300 whitespace-nowrap truncate max-w-full"
              title={category}
            >
              {shorten(category, 26)}
            </span>

            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/30 px-2.5 py-1 text-[11px] text-zinc-400 whitespace-nowrap truncate max-w-full"
                title={t}
              >
                {shorten(t, 22)}
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
