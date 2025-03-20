import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Dodaje novi komentar u Firestore kolekciju "comments".
 * 
 * @param {string} postId - ID posta na koji se dodaje komentar.
 * @param {string} userId - ID korisnika koji je napisao komentar.
 * @param {string} content - Tekst komentara.
 * @param {string | null} parentId - ID roditeljskog komentara (ako je odgovor), ili `null` ako je glavni komentar.
 * @returns {Promise<string>} - Vraca ID novog komentara ako je uspesno dodat.
 */

export const addComment = async (postId, userId, content, parentId) => {

    // Kreiramo objekat novog komentara
    const newComment = {
        postID: postId, // ID posta kojem komentar pripada
        userID: userId, // ID korisnika koji je postavio komentar
        content: content, // Sadrzaj komentara
        timestamp: serverTimestamp(), // Vreme kreiranja komentara (Firebase server)
        parentID: parentId || null,  // Ako je odgovor na komentar, ovde je parentID; ako nije, ostaje null
        likes: [] // Lista ID-jeva korisnika koji su lajkovali komentar
    };

    try {
        // Dodajemo komentar u Firestore kolekciju "comments"
        const docRef = await addDoc(collection(db, "comments"), newComment);

        // Vracamo ID novog komentara kako bismo ga koristili dalje u aplikaciji
        return docRef.id

    } catch (error) {
        console.error("Error adding comment:", error);

        // Ako dođe do greske, bacamo novi error koji moze biti uhvacen u kodu gde se poziva ova funkcija
        throw new Error("Failed to add comment");
    }
};