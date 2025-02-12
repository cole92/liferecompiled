import PropTypes from "prop-types";
import { useState, useRef, useEffect } from "react";
import { WithContext as ReactTags } from "react-tag-input";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { predefinedTags } from "../constants/tags";
import { categorizedTags } from "../constants/tags";
import "../styles/TagsInput.css";
import "../styles/TagsDropDown.css";

const TagsInput = ({ tags, setTags }) => {
  const [error, setError] = useState(null); // State za pracenje gresaka u unosu tagova
  const [inputValue, setInputValue] = useState(""); // State za pracenje trenutne vrednosti input polja
  const containerRef = useRef(null);

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
      if (event.key === "Escape") {
        setInputValue(""); // Zatvaramo dropdown na Escape
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Funkcija koja omogucava da sve validacije radimo unutar handleAddition
  // Backupovao sam metodu u slucaju da nekada pozelim da opet dodam funcionalnost dodavanja svojih tagova
  // Razlog je sto reactTags sami rade validaciju i preskakali su moje validacije na ovaj nacin je to bilo reseno
  // Takodje sam koristio SEPARATORS i ogranicio unos samo ne ENTER , bice mi opet jasno zbog cega ako dodjem opet do toga XD
  // ***********************************************************************************************************

  //const handleValidate = () => true;

  // ***********************************************************************************************************

  /**
   * Funkcija koja obradjuje promene u input polju.
   * - Sprecava korisnika da unese vodece razmake (pocetak unosa sa space).
   * - Azurira state inputValue.
   */
  const handleInputChange = (value) => {
    if (value.startsWith(" ")) {
      setInputValue(""); // Ako pocinje razmakom, brisemo unos
    } else {
      setInputValue(value); // Inace, azuriramo state
    }
  };

  /**
   * Funkcija koja dodaje novi tag:
   * - Radi validaciju broja tagova (max 5).
   * - Sprecava unos praznih tagova.
   * - Sprecava unos duplikata (case-insensitive).
   * - Validira format (dozvoljeni karakteri).
   * - Ogranicava maksimalnu duzinu taga (20 karaktera).
   * - Resetuje gresku ako je unos validan.
   */
  const handleAddition = (tag) => {
    const isPredefinedTag = predefinedTags.includes(tag.text);

    // **Sada filterTags pozivamo samo jednom**
    const filteredTags = filterTags(inputValue);
    const allFilteredTags = filteredTags.flatMap((category) => category.tags);

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

    // Ako je sve u redu, dodajemo tag
    setError(null);
    setTags([...tags, { id: foundTag, text: foundTag }]);
    setInputValue(inputValue); // Ostavlja korisnikov unos i ostavlja bug da se forma submituje cim dodamo tag iz liste!
  };

  /**
   * Funkcija za brisanje taga po indexu.
   * Filtrira niz tagova tako da se izostavi tag sa zadatim indexom.
   */
  const handleDelete = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  /**
   * Tag je onemogucen ako je korisnik vec odabrao 5 tagova.
   * Medjutim, ako je tag vec odabran, ostaje aktivan i moze se kliknuti.
   */
  const isTagDisabled = (tag) => {
    return (
      tags.length >= 5 &&
      !tags.some((t) => t.text.toLowerCase() === tag.toLowerCase())
    );
  };

  const filterTags = (inputValue) => {
    if (inputValue === "") return [];
    

    return Object.entries(categorizedTags)
      .map(([category, tags]) => ({
        name: category,
        tags: tags.filter((tag) =>
          tag.toLowerCase().includes(inputValue.toLowerCase())
        ),
      }))
      .filter((category) => category.tags.length > 0);
  };

  const renderFilteredTags = () => {
    const filtered = filterTags(inputValue); // Filtriramo tagove na osnovu inputa
    if (filtered.length === 0) return <p>No matching tags found</p>; // Ako nema rezultata
    
    return (
      <div className="dropdown-container">
        {filtered.map(({ name, tags }) => (
          <div key={name} className="dropdown-category">
            <h5 className="category-name">{name}</h5>
            <div className="tags-container">
              {tags.slice(0, 50).map((tag) => (
                <button
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
        {/* Label za tagove */}
        <label htmlFor="tags" className="form-label">
          Tags
        </label>
        {/* Predefinisani tagovi - dugmici koje korisnik moze da klikne */}
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
        {/* Pomocni tekst ispod polja */}
        <small className="form-text text-muted">
          Add up to 5 tags to describe your post.
        </small>
        {/* ReactTags komponenta za unos tagova */}
        <div className="tags-input-wrapper" ref={containerRef}>
          <ReactTags
            id="tags"
            tags={tags}
            handleDelete={handleDelete}
            handleAddition={handleAddition}
            // ** handleValidate={handleValidate} ** //
            allowUnique={false}
            inputValue={inputValue}
            handleInputChange={handleInputChange}
            inputFieldPosition="bottom"
            placeholder="Start typing to search for tags"
          />
          {inputValue && renderFilteredTags()}
        </div>
        {!error ? (
          <small className="form-text text-muted">
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
// PropTypes validacija za ocekivane propse
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
