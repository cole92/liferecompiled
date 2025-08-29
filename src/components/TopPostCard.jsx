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
      onClick={() => navigate(`/post/${post.id}`)}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && navigate(`/post/${post.id}`)
      }
      className="bg-white shadow rounded p-4 hover:shadow-md transition cursor-pointer"
    >
      {/* Naslov */}
      <h3 className="text-lg font-bold line-clamp-2">
        {post?.title ?? "Untitled"}
      </h3>

      {/* Preview teksta */}
      <p className="text-sm text-gray-600 mt-1 line-clamp-3 break-words">
        {previewText}
      </p>

      {/* Kategorija i tagovi */}
      <div className="mt-2 text-xs text-gray-500 space-x-2">
        <span className="inline-block rounded bg-gray-100 px-2 py-0.5 mr-2">
          {post?.category?.trim() || "Uncategorized"}
        </span>
        {tagList && (
          <span className="inline-block rounded bg-gray-100 px-2 py-0.5">
            {tagList}
          </span>
        )}
      </div>

      {/* Reakcije */}
      <p className="text-sm mt-3 font-medium">👍 {post?.reactionsCount ?? 0}</p>
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
