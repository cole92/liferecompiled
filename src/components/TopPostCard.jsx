import PropTypes from "prop-types";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

/**
 * @component TopPostCard
 *
 * Kompaktna karta za prikaz Top 3 postova autora.
 *
 * - Prikazuje naslov, kratak preview teksta i meta informacije
 * - Fallback logika: description → content → "No description"
 * - Ogranicava tagove na max 3 i normalizuje format
 * - Klik ili tastatura (Enter/Space) vodi na detalje posta
 *
 * @param {Object} post - Podaci o postu (id, title, description, content, category, tags, reactionsCount)
 * @returns {JSX.Element}
 */

function TopPostCard({ post }) {
  const navigate = useNavigate();

  const goToPost = () => navigate(`/post/${post.id}`);

  // Preview teksta (description → content fallback, skracivanje na 120 karaktera)
  const previewText = useMemo(() => {
    const desc = post?.description?.trim();
    if (desc && desc.length > 0) return desc;

    const content = post?.content ?? "";
    if (!content) return "No description";
    return content.length > 120 ? content.slice(0, 120) + "..." : content;
  }, [post?.description, post?.content]);

  // Tagovi (max 3), normalizovani na string
  const tagList = useMemo(() => {
    if (!Array.isArray(post?.tags)) return "";
    return post.tags
      .slice(0, 3)
      .map((t) => (typeof t === "string" ? t : t?.text ?? t?.name ?? "tag"))
      .filter(Boolean)
      .join(" • ");
  }, [post?.tags]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToPost}
      onKeyDown={(e) => {
        if (e.key === "Enter") goToPost();
        if (e.key === " ") {
          e.preventDefault();
          goToPost();
        }
      }}
      className="ui-card p-4 cursor-pointer transition duration-200 hover:bg-zinc-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
    >
      {/* Naslov */}
      <h3 className="text-lg font-semibold text-zinc-100 line-clamp-2">
        {post?.title ?? "Untitled"}
      </h3>

      {/* Preview teksta */}
      <p className="mt-1 text-sm text-zinc-300 line-clamp-3 break-words">
        {previewText}
      </p>

      {/* Kategorija i tagovi */}
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
        <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5">
          {post?.category?.trim() || "Uncategorized"}
        </span>

        {tagList && (
          <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5">
            {tagList}
          </span>
        )}
      </div>

      {/* Reakcije */}
      <p className="mt-3 text-sm font-medium text-zinc-200">
        👍 {post?.reactionsCount ?? 0}
      </p>
    </div>
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
      ])
    ),
    reactionsCount: PropTypes.number,
  }).isRequired,
};

export default TopPostCard;
