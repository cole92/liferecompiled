import PropTypes from "prop-types";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const MAX_TAGS_IN_APP = 5;
const MAX_ROWS = 2;

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

  const category = (post?.category || "Uncategorized").trim();
  const reactionsTotal = post?.reactionsCount ?? 0;

  const shorten = (s, n = 22) => {
    const str = String(s ?? "");
    if (!str) return "";
    return str.length > n ? str.slice(0, n - 1) + "…" : str;
  };

  const normalizeTagText = (t) => {
    const raw = String(t ?? "").trim();
    if (!raw) return "";
    // Remove leading hashes to avoid ##tag
    return raw.replace(/^#+/, "").trim();
  };

  const formatTagLabel = (t, maxLen = 22) => {
    const clean = normalizeTagText(t);
    if (!clean) return "";
    const withHash = `#${clean}`;
    return withHash.length > maxLen
      ? withHash.slice(0, maxLen - 1) + "…"
      : withHash;
  };

  const allTags = useMemo(() => {
    const raw = Array.isArray(post?.tags) ? post.tags : [];

    const normalized = raw
      .map((t) => (typeof t === "string" ? t : (t?.text ?? t?.name ?? "")))
      .map((t) => normalizeTagText(t))
      .filter(Boolean);

    // De-dupe case-insensitive, keep original casing of first occurrence
    const seen = new Set();
    const unique = [];

    for (const t of normalized) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(t);
      if (unique.length >= MAX_TAGS_IN_APP) break;
    }

    return unique;
  }, [post?.tags]);

  const pillsWrapRef = useRef(null);
  const measureRef = useRef(null);

  const [visibleTagCount, setVisibleTagCount] = useState(() =>
    Math.min(allTags.length, 2),
  );

  useLayoutEffect(() => {
    const wrap = pillsWrapRef.current;
    const measurer = measureRef.current;
    if (!wrap || !measurer) return;

    const getRowCount = (els) => {
      const tops = new Set();
      for (const el of els) {
        if (!el) continue;
        tops.add(el.offsetTop);
      }
      return tops.size;
    };

    const recalc = () => {
      const wrapW = wrap.getBoundingClientRect().width;
      if (!wrapW) return;

      measurer.style.width = `${wrapW}px`;

      const catEl = measurer.querySelector('[data-pill="category"]');
      const tagEls = Array.from(measurer.querySelectorAll('[data-pill="tag"]'));
      const moreEls = Array.from(
        measurer.querySelectorAll('[data-pill="more"]'),
      );

      if (!catEl) return;

      const fits = (k) => {
        const total = allTags.length;
        const hidden = total - k;

        catEl.style.display = "";

        for (let i = 0; i < tagEls.length; i++) {
          tagEls[i].style.display = i < k ? "" : "none";
        }

        let activeMoreEl = null;
        for (const el of moreEls) {
          const c = Number(el.getAttribute("data-count"));
          const on = hidden > 0 && c === hidden;
          el.style.display = on ? "" : "none";
          if (on) activeMoreEl = el;
        }

        const visibleEls = [catEl, ...tagEls.slice(0, k)];
        if (hidden > 0 && activeMoreEl) visibleEls.push(activeMoreEl);

        const rows = getRowCount(visibleEls);
        return rows <= MAX_ROWS;
      };

      let best = 0;
      for (let k = allTags.length; k >= 0; k--) {
        if (fits(k)) {
          best = k;
          break;
        }
      }

      setVisibleTagCount((prev) => (prev === best ? prev : best));
    };

    recalc();

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => recalc());
      ro.observe(wrap);
    }

    window.addEventListener("resize", recalc);

    return () => {
      window.removeEventListener("resize", recalc);
      if (ro) ro.disconnect();
    };
  }, [allTags, category]);

  const safeVisibleTagCount = Math.max(
    0,
    Math.min(visibleTagCount, allTags.length),
  );
  const visibleTags = allTags.slice(0, safeVisibleTagCount);
  const hiddenCount = Math.max(0, allTags.length - visibleTags.length);

  const pillCategory =
    "inline-flex items-center rounded-full border border-zinc-800 " +
    "bg-zinc-950/40 px-2.5 py-1 text-[11px] text-zinc-300 " +
    "whitespace-nowrap truncate max-w-full";

  const pillTag =
    "inline-flex items-center rounded-full border border-zinc-800 " +
    "bg-zinc-950/30 px-2.5 py-1 text-[11px] text-zinc-400 " +
    "whitespace-nowrap truncate max-w-full";

  const pillMore =
    "inline-flex items-center rounded-full border border-zinc-800 " +
    "bg-zinc-950/20 px-2.5 py-1 text-[11px] text-zinc-400 " +
    "whitespace-nowrap";

  return (
    <button
      type="button"
      onClick={goToPost}
      className={[
        "relative ui-card w-full h-full p-4 text-left overflow-hidden",
        "transition duration-200 hover:bg-zinc-900/40",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
      ].join(" ")}
      aria-label={`Open post: ${post?.title ?? "Untitled"}`}
    >
      <div className="flex h-full min-w-0 flex-col">
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

        <div className="mt-auto pt-4 min-w-0">
          <div ref={pillsWrapRef} className="flex flex-wrap gap-2 min-w-0">
            <span className={pillCategory} title={category}>
              {shorten(category, 26)}
            </span>

            {visibleTags.map((t, i) => (
              <span key={`${t}_${i}`} className={pillTag} title={`#${t}`}>
                {formatTagLabel(t, 22)}
              </span>
            ))}

            {hiddenCount > 0 && (
              <span className={pillMore} title={`${hiddenCount} more`}>
                +{hiddenCount}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Total reactions</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-[12px] font-semibold text-zinc-100">
              👍 {reactionsTotal}
            </span>
          </div>
        </div>
      </div>

      <div
        ref={measureRef}
        className="pointer-events-none absolute left-0 top-0 -z-10 h-0 overflow-hidden opacity-0"
      >
        <div className="flex flex-wrap gap-2 min-w-0">
          <span data-pill="category" className={pillCategory}>
            {shorten(category, 26)}
          </span>

          {allTags.map((t, i) => (
            <span data-pill="tag" key={`m_${t}_${i}`} className={pillTag}>
              {formatTagLabel(t, 22)}
            </span>
          ))}

          {Array.from({ length: allTags.length }, (_, i) => i + 1).map((n) => (
            <span
              data-pill="more"
              data-count={n}
              key={`more_${n}`}
              className={pillMore}
            >
              +{n}
            </span>
          ))}
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
