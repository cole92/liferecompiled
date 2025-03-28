import PropTypes from "prop-types";
import CommentForm from "./CommentForm";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy, } from "firebase/firestore";
import { db } from "../../firebase";
import CommentItem from "./CommentItem";


/**
 * Komponenta za prikaz i dodavanje komentara na post.
 * Koristi se kao preview u post karticama (prva 2 komentara) ili
 * za prikaz svih komentara na stranici pojedinacnog posta.
 *
 * @param {string} postID - ID posta na koji se komentari odnose.
 * @param {string} userId - ID trenutno prijavljenog korisnika (za formu).
 */

const Comments = ({ postID, userId, showAll = false }) => {
  // State koji cuva komentare povezane sa postom
  const [comments, setComments] = useState([]);

  useEffect(() => {
    // Ako ne postoji postID, ne pokrecemo nista
    if (!postID) return;

    // Kreiramo Firestore upit:
    // Uzimamo komentare koji pripadaju ovom postu, sortirane po vremenu unazad
    const q = query(
      collection(db, "comments"), // Kolekcija komentara
      where("postID", "==", postID), // Filtriramo po ID-ju posta
      orderBy("timestamp", "desc") // Sortiramo po vremenu opadajuce (najnoviji prvi)
    );
    // Subscribujemo se na real-time promene pomocu onSnapshot
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map((doc) => ({
        id: doc.id, // Dodajemo ID dokumenta
        ...doc.data(), // Kombinujemo sa podacima iz Firestore-a
      }));
      setComments(results); // Azuriramo state sa novim komentarima
    });
    // Cleanup funkcija – prekida listener kada komponenta unmount-uje
    return unsubscribe;
  }, [postID]); // useEffect se pokrece samo kada se promeni postID

  return (
    <div>
      {/* Forma za dodavanje komentara */}
      <CommentForm postId={postID} userId={userId} parentId={null} />

      {/* Prikaz prva dva komentara (preview prikaz) */}
      {(showAll? comments : comments.slice(0, 2)).map((comment) => (
        <CommentItem
          key={comment.id}                   // Jedinstveni ID komentara (Firestore doc.id)
          userId={comment.userID}            // ID korisnika (koristi se za dohvat imena i slike)
          content={comment.content}          // Tekst komentara
          timestamp={comment.timestamp}      // Vreme kada je komentar dodat
        />
      ))}
    </div>
  );
};

// Validacija props-a
Comments.propTypes = {
  postID: PropTypes.string.isRequired, // Obavezno postID mora biti string
  userId: PropTypes.string,            // Moze biti undefined ako korisnik nije ulogovan
  showAll: PropTypes.bool,             // True za prikaz svih komentara
};

export default Comments;
