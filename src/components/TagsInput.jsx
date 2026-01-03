import PropTypes from "prop-types";
import { useState, useRef, useEffect } from "react";
import { WithContext as ReactTags } from "react-tag-input";
import { predefinedTags } from "../constants/tags";
import { categorizedTags } from "../constants/tags";

const TagsInput = ({ tags, setTags }) => {
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef(null);

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
    if (value.startsWith(" ")) {
      setInputValue("");
    } else {
      setInputValue(value);
    }
  };

  const filterTags = (value) => {
    if (!value) return [];

    return Object.entries(categorizedTags)
      .map(([category, list]) => ({
        name: category,
        tags: list.filter((t) => t.toLowerCase().includes(value.toLowerCase())),
      }))
      .filter((cat) => cat.tags.length > 0);
  };

  const handleAddition = (tag) => {
    const isPredefinedTag = predefinedTags.includes(tag.text);

    const filteredTags = filterTags(inputValue);
    const allFilteredTags = filteredTags.flatMap((c) => c.tags);

    const foundTag = isPredefinedTag
      ? tag.text
      : allFilteredTags.find((t) => t.toLowerCase() === tag.text.toLowerCase());

    if (!foundTag) {
      setError("Please select a tag from the list.");
      return;
    }

    if (tags.length >= 5) {
      setError("You can add up to 5 tags only.");
      return;
    }

    if (tags.some((t) => t.text.toLowerCase() === foundTag.toLowerCase())) {
      setError("Duplicate tags are not allowed.");
      return;
    }

    setError(null);
    setTags([...tags, { id: foundTag, text: foundTag }]);

    // MVP: reset input after successful add
    setInputValue("");
  };

  const handleDelete = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const isTagDisabled = (tag) => {
    return (
      tags.length >= 5 &&
      !tags.some((t) => t.text.toLowerCase() === tag.toLowerCase())
    );
  };

  const renderFilteredTags = () => {
    const filtered = filterTags(inputValue);
    if (filtered.length === 0) {
      return (
        <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-lg">
          <p className="text-sm text-zinc-400">No matching tags found</p>
        </div>
      );
    }

    return (
      <div className="absolute left-0 top-full z-50 mt-2 w-full max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-lg">
        {filtered.map(({ name, tags: list }, idx) => (
          <div key={name} className={idx === 0 ? "" : "mt-4"}>
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {name}
            </h5>

            <div className="flex flex-wrap gap-2">
              {list.slice(0, 50).map((tag) => (
                <button
                  type="button"
                  key={`${name}-${tag}`}
                  className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  onClick={() => handleAddition({ id: tag, text: tag })}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="mt-4 h-px w-full bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  };

  const tagButtonBase =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

  return (
    <div className="space-y-2">
      <label htmlFor="tags" className="block text-sm font-medium text-zinc-200">
        Tags
      </label>

      {/* Predefined tags */}
      <div className="flex flex-wrap gap-2">
        {predefinedTags.map((tag) => {
          const isActive = tags.some(
            (t) => t.text.toLowerCase() === tag.toLowerCase()
          );
          const disabled = isTagDisabled(tag);

          return (
            <button
              key={tag}
              type="button"
              className={`${tagButtonBase} ${
                isActive
                  ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-500"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={() => handleAddition({ id: tag, text: tag })}
              disabled={disabled}
              aria-pressed={isActive}
            >
              {tag}
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
              "inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-300 hover:bg-zinc-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
            tagInput: "w-full",
            tagInputField:
              "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
          }}
        />

        {inputValue && renderFilteredTags()}
      </div>

      {!error ? (
        <p className="text-xs text-zinc-400">
          Allowed characters: letters, numbers, spaces, dots, underscores, plus
          (+), hyphens (-), hashtags (#).
        </p>
      ) : (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};

TagsInput.propTypes = {
  tags: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    })
  ).isRequired,
  setTags: PropTypes.func.isRequired,
};

export default TagsInput;
