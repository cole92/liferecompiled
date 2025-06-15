import PropTypes from "prop-types";
import { useRef, useEffect, useState } from "react";
import { addCommentSecure } from "../../firebase/functions";
import { showErrorToast } from "../../utils/toastUtils";

/**
 * Komponenta za unos komentara.
 *
 * Omogucava korisniku da napise komentar i posalje ga u Firestore.
 * Moze se koristiti za dodavanje glavnih komentara ili odgovora (replies) ako je prosledjen `parentId`.
 * Podrzava automatsko fokusiranje i vizuelni indikator preostalog broja karaktera.
 *
 * @component
 * @param {string} postId - ID posta na koji se dodaje komentar.
 * @param {string} userId - ID trenutno prijavljenog korisnika koji unosi komentar.
 * @param {string|null} parentId - ID roditeljskog komentara ako se radi o odgovoru.
 * @param {Function} [onSubmitSuccess] - Callback koji se poziva nakon uspesnog unosa komentara.
 * @param {boolean} [autoFocus=false] - Ako je true, automatski fokusira textarea pri mountovanju komponente.
 */

const CommentForm = ({
  postId,
  parentId,
  onSubmitSuccess,
  autoFocus = false,
}) => {
  // State za pracenje unetog teksta komentara
  const [commentContent, setCommentContent] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef(null);
  const isCommentValid = commentContent.trim().length > 0;

  useEffect(() => {
    // Ako je autoFocus aktivan, fokusiraj textarea i skroluj je u centar ekrana
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [autoFocus]);

  /**
   * Obradjuje submit forme.
   * Sprecava osvecavanje stranice i slanje praznog komentara.
   * Dodaje komentar u Firestore i resetuje polje za unos.
   *
   * @param {Event} e - Objekat dogadjaja submit event-a.
   */

  const handleSubmit = async (e) => {
    e.preventDefault(); // Sprecava reload stranice
    e.stopPropagation(); // Sprecava klik da pokrene `onClick` event iz PostCard

    try {
      if (!commentContent.trim()) {
        // Sprecava slanje praznog komentara
        setError("Comment form cannot be empty.");
        return;
      }

      await addCommentSecure({
        postId,
        content: commentContent,
        parentId,
      });
      setCommentContent(""); // Resetuje textarea nakon uspesnog slanja
      onSubmitSuccess?.(); // Poziva se nakon uspesnog unosa komentara (npr. zatvaranje forme kod odgovora)
    } catch (error) {
      if (
        error.message.includes("too quickly") ||
        error.message.includes("resource-exhausted")
      ) {
        showErrorToast(
          "You're sending comments too quickly. Please try again in a few seconds."
        );
      } else {
        showErrorToast("An error occurred while submitting the comment.");
      }
    }
  };

  // Prikaz broja preostalih karaktera (maksimum 500)
  const remainingChars = 500 - commentContent.length;
  const charCountColor =
    remainingChars <= 50 ? "text-red-500" : "text-gray-500";

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className="mt-6"
    >
      <textarea
        ref={textareaRef}
        placeholder="Add comment..."
        className="w-full border rounded-lg p-2 mb-2 focus:outline-none"
        rows={3}
        value={commentContent}
        onChange={(e) => {
          setCommentContent(e.target.value);
          if (error) setError("");
        }}
        maxLength={500}
      ></textarea>
      {(!isCommentValid || error) && (
        <p className="text-gray-500 text-sm mb-1">
          {error || "Comment cannot be empty."}
        </p>
      )}
      <div className={`text-right text-sm ${charCountColor} mb-2`}>
        {commentContent.length} / 500
      </div>
      <button
        type="submit"
        disabled={!isCommentValid}
        className={`px-4 py-1 text-sm rounded-lg transition ${
          isCommentValid
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        Send comment
      </button>
    </form>
  );
};

// Validacija props-a
CommentForm.propTypes = {
  postId: PropTypes.string.isRequired, // Obavezno postID mora biti string
  parentId: PropTypes.string, // parentId moze biti string ili undefined (nije obavezan)
  onSubmitSuccess: PropTypes.func,
  autoFocus: PropTypes.bool,
};

export default CommentForm;
