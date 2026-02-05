import PropTypes from "prop-types";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { WithContext as ReactTags } from "react-tag-input";
import { predefinedTags, categorizedTags } from "../constants/tags";

const MOBILE_PREDEFINED_LIMIT = 12;
const MAX_TAGS = 5;
const MAX_PER_CATEGORY = 50;

function formatCategoryName(key) {
  const s = String(key ?? "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

function buildTagIndex() {
  const all = new Map();
  const categories = [];

  Object.entries(categorizedTags).forEach(([key, list]) => {
    // Predefined already shown as chips; keep it out of dropdown for less noise.
    if (key === "predefined") {
      (list || []).forEach((t) => {
        const text = String(t);
        const lc = text.toLowerCase();
        if (!all.has(lc)) all.set(lc, text);
      });
      return;
    }

    const raw = Array.isArray(list) ? list : [];
    const indexed = raw.map((text) => {
      const s = String(text);
      const lc = s.toLowerCase();
      if (!all.has(lc)) all.set(lc, s);
      return { text: s, lc };
    });

    categories.push({
      key,
      label: formatCategoryName(key),
      tags: indexed,
    });
  });

  // Ensure predefined tags exist in the map as well.
  predefinedTags.forEach((t) => {
    const text = String(t);
    const lc = text.toLowerCase();
    if (!all.has(lc)) all.set(lc, text);
  });

  return { all, categories };
}

const TAG_INDEX = buildTagIndex();

const TagsInput = ({ tags, setTags }) => {
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [showAllMobile, setShowAllMobile] = useState(false);
  const containerRef = useRef(null);

  const deferredInput = useDeferredValue(inputValue);

  useEffect(() => {
    if (tags.length === 0) setError(null);
  }, [tags]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setInputValue("");
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setInputValue("");
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleInputChange = (value) => {
    if (value.startsWith(" ")) setInputValue("");
    else setInputValue(value);
  };

  const handleAddition = (tag) => {
    const raw = String(tag?.text ?? "").trim();
    if (!raw) return;

    const lc = raw.toLowerCase();
    const canonical = TAG_INDEX.all.get(lc);

    if (!canonical) {
      setError("Please select a tag from the list.");
      return;
    }

    if (tags.length >= MAX_TAGS) {
      setError("You can add up to 5 tags only.");
      return;
    }

    if (
      tags.some(
        (t) => String(t.text ?? "").toLowerCase() === canonical.toLowerCase(),
      )
    ) {
      setError("Duplicate tags are not allowed.");
      return;
    }

    setError(null);
    setTags([...tags, { id: canonical, text: canonical }]);
    setInputValue("");
  };

  const handleDelete = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const isTagDisabled = (tagText) => {
    return (
      tags.length >= MAX_TAGS &&
      !tags.some(
        (t) =>
          String(t.text ?? "").toLowerCase() === String(tagText).toLowerCase(),
      )
    );
  };

  const query = useMemo(
    () => deferredInput.trim().toLowerCase(),
    [deferredInput],
  );

  const filteredForRender = useMemo(() => {
    if (!query) return [];

    const out = [];

    for (const cat of TAG_INDEX.categories) {
      const matches = [];
      for (const t of cat.tags) {
        if (t.lc.includes(query)) {
          matches.push(t.text);
          if (matches.length >= MAX_PER_CATEGORY) break;
        }
      }
      if (matches.length) out.push({ name: cat.label, tags: matches });
    }

    return out;
  }, [query]);

  const renderFilteredTags = () => {
    if (filteredForRender.length === 0) {
      return (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-lg">
          <p className="text-sm text-zinc-400">No matching tags found</p>
        </div>
      );
    }

    return (
      <div className="absolute left-0 top-full z-50 mt-2 w-full max-h-72 overflow-auto ui-scrollbar rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-lg">
        {filteredForRender.map(({ name, tags: list }, idx) => (
          <div key={name} className={idx === 0 ? "" : "mt-4"}>
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {name}
            </h5>

            <div className="flex flex-wrap gap-2">
              {list.map((tagText) => (
                <button
                  type="button"
                  key={`${name}-${tagText}`}
                  className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  onClick={() => handleAddition({ id: tagText, text: tagText })}
                >
                  {tagText}
                </button>
              ))}
            </div>

            {idx !== filteredForRender.length - 1 ? (
              <div className="mt-4 h-px w-full bg-zinc-800" />
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const tagButtonBase =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

  const mobilePredefined = showAllMobile
    ? predefinedTags
    : predefinedTags.slice(0, MOBILE_PREDEFINED_LIMIT);

  return (
    <div className="space-y-2">
      <label htmlFor="tags" className="ui-label">
        Tags
      </label>

      {/* Predefined tags - mobile compact */}
      <div className="sm:hidden">
        <div className="flex flex-wrap gap-2">
          {mobilePredefined.map((tagText) => {
            const isActive = tags.some(
              (t) =>
                String(t.text ?? "").toLowerCase() ===
                String(tagText).toLowerCase(),
            );
            const disabled = isTagDisabled(tagText);

            return (
              <button
                key={tagText}
                type="button"
                className={`${tagButtonBase} ${
                  isActive
                    ? "border-sky-600 bg-sky-600 text-zinc-50 hover:bg-sky-500"
                    : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                onClick={() => handleAddition({ id: tagText, text: tagText })}
                disabled={disabled}
                aria-pressed={isActive}
              >
                {tagText}
              </button>
            );
          })}
        </div>

        {predefinedTags.length > MOBILE_PREDEFINED_LIMIT ? (
          <button
            type="button"
            className="mt-2 text-sm text-zinc-300 hover:text-zinc-100 underline underline-offset-4 decoration-zinc-500/60"
            onClick={() => setShowAllMobile((v) => !v)}
          >
            {showAllMobile ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>

      {/* Predefined tags - sm+ full */}
      <div className="hidden sm:flex sm:flex-wrap sm:gap-2">
        {predefinedTags.map((tagText) => {
          const isActive = tags.some(
            (t) =>
              String(t.text ?? "").toLowerCase() ===
              String(tagText).toLowerCase(),
          );
          const disabled = isTagDisabled(tagText);

          return (
            <button
              key={tagText}
              type="button"
              className={`${tagButtonBase} ${
                isActive
                  ? "border-sky-600 bg-sky-600 text-zinc-50 hover:bg-sky-500"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={() => handleAddition({ id: tagText, text: tagText })}
              disabled={disabled}
              aria-pressed={isActive}
            >
              {tagText}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400">
        Add up to 5 tags to describe your post.
      </p>

      <div
        className="relative"
        ref={containerRef}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      >
        <ReactTags
          id="tags"
          tags={tags}
          handleDelete={handleDelete}
          handleAddition={handleAddition}
          allowUnique={false}
          allowDragDrop={false}
          inputValue={inputValue}
          handleInputChange={handleInputChange}
          inputFieldPosition="bottom"
          placeholder="Start typing to search for tags"
          classNames={{
            tags: "space-y-2",
            selected: "flex flex-wrap gap-2",
            tag: "inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-100",
            remove:
              "inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 " +
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
            tagInput: "w-full",
            tagInputField: "ui-input mt-0",
          }}
        />

        {inputValue ? renderFilteredTags() : null}
      </div>

      {!error ? (
        <p className="text-xs text-zinc-400">
          Allowed characters: letters, numbers, spaces, dots, underscores, plus
          (+), hyphens (-), hashtags (#).
        </p>
      ) : (
        <p className="ui-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

TagsInput.propTypes = {
  tags: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    }),
  ).isRequired,
  setTags: PropTypes.func.isRequired,
};

export default TagsInput;
