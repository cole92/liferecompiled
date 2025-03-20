import PropTypes from "prop-types";
import CommentForm from "./CommentForm";

/**
 * Komponenta za upravljanje komentarima na postu.
 * Trenutno sadrzi samo formu za dodavanje komentara, a kasnije ce prikazivati i postojece komentare.
 *
 * @param {string} postId - ID posta za koji se prikazuju komentari.
 * @param {string} userId - ID trenutno prijavljenog korisnika.
 */

const Comments = ({ postId, userId }) => {
  return (
    <div>
      {/* Forma za dodavanje komentara */}
      <CommentForm postId={postId} userId={userId} parentId={null} />

      {/* Placeholder gde cemo kasnije prikazati komentare */}
      <p>Ovde ce se prikazivati komentari...</p>
    </div>
  );
};

// Validacija props-a
Comments.propTypes = {
  postId: PropTypes.string.isRequired, // Obavezno postID mora biti string
  userId: PropTypes.string.isRequired, // Obavezno userID mora biti string
};

export default Comments;
