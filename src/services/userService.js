import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Dohvata korisnicke podatke iz Firestore-a na osnovu userID-ja.
 * @param {string} userId - ID korisnika
 * @returns {object|null} - Podaci o korisniku (ime, slika...) ili null ako ne postoji
 */

export const getUserById = async (userId) => {
    try {
        const ref = doc(db, "users", userId);         // Referenca na dokument
        const snap = await getDoc(ref)                // Dohvata dokument iz Firestore-a

        if (snap.exists()) {                          // Proveravamo da li postoji
            return snap.data();                       // Vracamo podatke (npr. name, profilePicture)
        }

        return null;                                  // Ako ne postoji, vracamo null

    } catch (error) {
        console.error("Error fetching user:", error);
        throw new Error("Failed to fetch user");
    }
};