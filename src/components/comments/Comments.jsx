import PropTypes from "prop-types";
import CommentForm from "./CommentForm";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, } from "firebase/firestore";
import { db } from "../../firebase";


/**
 * Komponenta za prikaz i dodavanje komentara na post.
 * U okviru ove komponente prikazuju se prva dva komentara (preview),
 * kao i forma za unos novog komentara.
 *
 * @param {string} postID - ID posta na koji se komentari odnose.
 * @param {string} userId - ID trenutno prijavljenog korisnika (potreban za formu).
 */

const Comments = ({  postID, userId }) => {
  // State koji cuva komentare povezane sa postom
  const [comments, setComments] = useState([]);

  useEffect(() => {
    // Ako ne postoji postID, ne pokrecemo nista
    if (!postID) return;

    // Kreiramo Firestore upit:
    // Uzimamo komentare koji pripadaju ovom postu, sortirane po vremenu unazad
    const q = query(
      collection(db, "comments"),            // Kolekcija komentara
      where("postID", "==", postID),         // Filtriramo po ID-ju posta
      orderBy("timestamp", "desc")           // Sortiramo po vremenu opadajuće (najnoviji prvi)
    );
    // Subscribujemo se na real-time promene pomocu onSnapshot
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map((doc) => ({
        id: doc.id,          // Dodajemo ID dokumenta
        ...doc.data(),       // Kombinujemo sa podacima iz Firestore-a
      }));
      setComments(results);  // Azuriramo state sa novim komentarima
    });
    // Cleanup funkcija – prekida listener kada komponenta unmount-uje
    return unsubscribe;

  }, [postID]); // useEffect se pokrece samo kada se promeni postID

  return (
    <div>
      {/* Forma za dodavanje komentara */}
      <CommentForm postId={postID} userId={userId} parentId={null} />

      {/* Prikaz prva dva komentara (preview prikaz) */}
      {comments.slice(0, 2).map((comment) => (
        <div key={comment.id} className="comment-item"> 
          <p><strong>User:</strong> {comment.userID}</p>
          <p>{comment.content}</p>
           {/* Vreme prikaza komentara se trenutno ne koristi */}
          {/* <small>{comment.timestamp?.toDate().toLocaleString()}</small> */}
        </div>
      ))}
    </div>
  );
};

// Validacija props-a
Comments.propTypes = {
  postID: PropTypes.string.isRequired, // Obavezno postID mora biti string
  userId: PropTypes.string.isRequired, // Obavezno userID mora biti string
};

export default Comments;
