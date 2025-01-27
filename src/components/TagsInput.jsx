import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { WithContext as ReactTags } from "react-tag-input";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { predefinedTags } from "../constants/tags";
import { toast } from "react-toastify";
import "../styles/TagsInput.css";

const TagsInput = ({ tags, setTags }) => {
  const [error, setError] = useState(null); // State za greske

  // Funkcija za dodavanje novog taga
  const handleAddition = (tag) => {
    // Maximalan broj tagova
    if (tags.length >= 5) {
      setError("You can add up to 5 tags only.");
      return;
    }
    const trimmedTag = tag.text.trim();
    if (trimmedTag.length === 0) {
      setError("Tags cannot be empty or just spaces.");
      return;
    }

    // Sprecavanje duplikate
    const isDuplicate = tags.some(
      (t) => t.text.toLowerCase() === trimmedTag.toLowerCase()
    );
    if (isDuplicate) {
      setError("Duplicate tags are not allowed.");
      return;
    }

    // Validacija formata
    const validFormat = /^[a-zA-Z0-9_+\-# .]+$/;
    if (!validFormat.test(trimmedTag)) {
      setError("Tags can only contain letters, numbers, underscores, or hyphens.");
      return;
    }

    if (trimmedTag.length > 20) {
      setError("Tags must be 20 characters or shorter.");
      return;
    }

    // Ako je sve validno, dodajemo tag
    setError(null); // Resetujemo gresku
    setTags([...tags, { id: trimmedTag, text: trimmedTag }]);
  };
  useEffect(() => {
    if (error) {
      // Prikazujemo toast kada postoji greska
      toast.error(error);
    }
  }, [error]); // Pokrece se svaki put kada se greska promeni

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
        {/* Predefinisani tagovi */}
        <div className="mb-2">
          {predefinedTags.map((tag) => (
            <button
              key={tag} // Jedinstveni kljuc za svaki tag
              type="button"
              className="btn btn-outline-primary btn-sm me-2 mb-2" // Stilizacija
              onClick={() => handleAddition({ id: tag, text: tag })} // Klik dodaje tag
              disabled={tags.some((t) => t.text === tag) || tags.length >= 5} // Onemogucava ponovni klik
            >
              {tag}
            </button>
          ))}
        </div>
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
