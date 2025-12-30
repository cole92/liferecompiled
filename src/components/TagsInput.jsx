import PropTypes from "prop-types";
import { useState, useRef, useEffect } from "react";
import { WithContext as ReactTags } from "react-tag-input";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { predefinedTags } from "../constants/tags";
import { categorizedTags } from "../constants/tags";
import "../styles/TagsDropDown.css";
import "../styles/tagsInput.css"

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

    // MVP: reset input after successful add (closes dropdown + avoids weird states)
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
    if (filtered.length === 0) return <p>No matching tags found</p>;

    return (
      <div className="dropdown-container">
        {filtered.map(({ name, tags: list }) => (
          <div key={name} className="dropdown-category">
            <h5 className="category-name">{name}</h5>

            <div className="tags-container">
              {list.slice(0, 50).map((tag) => (
                <button
                  type="button"
                  key={`${name}-${tag}`}
                  className="tag-btn"
                  onClick={() => handleAddition({ id: tag, text: tag })}
                >
                  {tag}
                </button>
              ))}
            </div>

            <hr className="divider" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mb-3">
        <label htmlFor="tags" className="form-label">
          Tags
        </label>

        {/* Predefined tags */}
        <div className="mb-2">
          {predefinedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`btn btn-outline-primary btn-sm me-2 mb-2 ${
                tags.some((t) => t.text.toLowerCase() === tag.toLowerCase())
                  ? "active"
                  : ""
              }`}
              onClick={() => handleAddition({ id: tag, text: tag })}
              disabled={isTagDisabled(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <small className="form-text text-light">
          Add up to 5 tags to describe your post.
        </small>

        {/* ReactTags input + dropdown */}
        <div
          className="tags-input-wrapper"
          ref={containerRef}
          onKeyDown={(e) => {
            // Prevent form submit from inside tag input
            if (e.key === "Enter") e.preventDefault();
          }}
        >
          <ReactTags
            id="tags"
            tags={tags}
            handleDelete={handleDelete}
            handleAddition={handleAddition}
            allowUnique={false}
            inputValue={inputValue}
            handleInputChange={handleInputChange}
            inputFieldPosition="bottom"
            placeholder="Start typing to search for tags"
          />

          {inputValue && renderFilteredTags()}
        </div>

        {!error ? (
          <small className="form-text text-light">
            Allowed characters: letters, numbers, spaces, dots, underscores,
            plus (+), hyphens (-), hashtags (#).
          </small>
        ) : (
          <div className="invalid-feedback d-block">{error}</div>
        )}
      </div>
    </DndProvider>
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
