import PropTypes from "prop-types";
import { useState } from "react";
import { WithContext as ReactTags, SEPARATORS } from "react-tag-input";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { predefinedTags } from "../constants/tags";
import "../styles/TagsInput.css";

const TagsInput = ({ tags, setTags }) => {
  // State za pracenje gresaka u unosu tagova
  const [error, setError] = useState(null);
  // State za pracenje trenutne vrednosti input polja
  const [inputValue, setInputValue] = useState("");

  // Definišemo koji tasteri zavrsavaju unos taga (samo Enter)
  const separators = [SEPARATORS.ENTER];
  // Funkcija koja omogucava da sve validacije radimo unutar handleAddition
  const handleValidate = () => true;

  /**
   * Funkcija koja obrađuje promene u input polju.
   * - Sprečava korisnika da unese vodeće razmake (početak unosa sa space).
   * - Ažurira state inputValue.
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
    if (tags.length >= 5) {
      setInputValue(""); // Resetuje input
      return setError("You can add up to 5 tags only.");
    }

    const trimmedTag = tag.text.trim(); // Uklanjamo nepotrebne razmake
    // Normalizacija unosa (pretvaranje u lowercase za poredjenje)
    const normalizedTag = trimmedTag.toLowerCase();
    // Provera duplikata
    if (tags.some((t) => t.text.toLowerCase() === normalizedTag)) {
      setInputValue("");
      return setError("Duplicate tags are not allowed.");
    }
    // Regex validacija - dozvoljeni karakteri
    const validFormat = /^[a-zA-Z0-9_+\-# .]+$/;
    if (!validFormat.test(trimmedTag)) {
      setInputValue("");
      return setError(
        "Allowed characters: letters, numbers, spaces, dots, underscores, plus (+), hyphens (-), hashtags (#)."
      );
    }
    // Ogranicenje duzine taga (max 20 karaktera)
    if (trimmedTag.length > 20) {
      setInputValue(trimmedTag.slice(0, 20)); // Skrati na 20 karaktera
      return setError("Tags must be 20 characters or shorter.");
    }

    // Ako je sve prošlo validaciju, dodajemo tag
    setError(null);
    setTags([...tags, { id: trimmedTag, text: trimmedTag }]);

    // Resetujemo inputValue nakon uspešnog dodavanja
    setInputValue("");
  };
  /**
   * Funkcija za brisanje taga po indexu.
   * Filtrira niz tagova tako da se izostavi tag sa zadatim indexom.
   */

  const handleDelete = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mb-3">
        {/* Label za tagove */}
        <label htmlFor="tags" className="form-label">
          Tags
        </label>

        {/* Predefinisani tagovi - dugmici koje korisnik može da klikne */}
        <div className="mb-2">
          {predefinedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="btn btn-outline-primary btn-sm me-2 mb-2"
              onClick={() => handleAddition({ id: tag, text: tag })}
              disabled={
                tags.some((t) => t.text.toLowerCase() === tag.toLowerCase()) ||
                tags.length >= 5
              }
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
        <ReactTags
          id="tags"
          tags={tags}
          separators={separators} // Koristimo SEPARATORS.ENTER umesto zastarelog delimiters
          handleDelete={handleDelete}
          handleAddition={handleAddition}
          handleValidate={handleValidate}
          allowUnique={false} // Dozvoljava duplikate da dođu do handleAddition gde ih mi validiramo
          inputValue={inputValue} // Vežemo state input polja
          handleInputChange={handleInputChange} // Pratimo promene u inputu
          inputFieldPosition="bottom" // Input polje ispod liste tagova
          placeholder="Press Enter to add tag"
        />
        {/* Prikazivanje greske ispod input polja */}
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
