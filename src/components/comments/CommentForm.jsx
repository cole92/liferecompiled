import PropTypes from "prop-types";
import { useState } from "react";
import { addComment } from "./commentsService";

/**
 * Komponenta za unos komentara.
 * Omogucava korisniku da napise komentar i posalje ga u Firestore.
 *
 * @param {string} postId - ID posta na koji se dodaje komentar.
 * @param {string} userId - ID trenutno prijavljenog korisnika koji unosi komentar.
 * @param {string | null} parentId - Ako je komentar odgovor, ovo je ID roditeljskog komentara; ako nije, ostaje null.
 */

const CommentForm = ({ postId, userId, parentId }) => {
  // State za pracenje unetog teksta komentara
  const [commentContent, setcommentContent] = useState("");

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
      if (!commentContent.trim()) return; // Sprecava slanje praznog komentara

      await addComment(postId, userId, commentContent, parentId);
      setcommentContent(""); // Resetuje textarea nakon uspesnog slanja
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        {/* Textarea za unos komentara */}
        <textarea
          value={commentContent}
          onChange={(e) => setcommentContent(e.target.value)}
          placeholder="Write comment..."
        ></textarea>
        {/* Dugme za slanje komentara */}
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

// Validacija props-a
CommentForm.propTypes = {
  postId: PropTypes.string.isRequired, // Obavezno postID mora biti string
  userId: PropTypes.string.isRequired, // Obavezno userID mora biti string
  parentId: PropTypes.string, // parentId moze biti string ili undefined (nije obavezan)
};

export default CommentForm;
