import PropTypes from "prop-types";
import { WithContext as ReactTags } from "react-tag-input";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "../styles/TagsInput.css";

const TagsInput = ({ tags, setTags }) => {
  // Funkcija za dodavanje novog taga
  const handleAddition = (tag) => {
    setTags([...tags, tag]);
  };

  // Funkcija za brisanje taga
  const handleDelete = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mb-3">
        <label htmlFor="tags" className="form-label">
          Tags
        </label>
        <ReactTags
          tags={tags}
          handleDelete={handleDelete}
          handleAddition={handleAddition}
          placeholder="Add a tag"
        />
        <small className="form-text text-muted">
          Add up to 5 tags to describe your post.
        </small>
      </div>
    </DndProvider>
  );
};

// PropTypes validacija
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
