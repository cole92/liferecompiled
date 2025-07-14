import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Dohvata korisnicke podatke iz Firestore-a na osnovu userID-ja.
 *
 * @async
 * @function getUserById
 * @param {string} userId - ID korisnika.
 * @returns {Promise<object|null>} Podaci o korisniku (ime, slika...) ili null ako ne postoji.
 */

export const getUserById = async (userId) => {
    try {
        const ref = doc(db, "users", userId);
        const snap = await getDoc(ref)

        if (snap.exists()) {
            return {
                id: snap.id,
                ...snap.data(),
                badges: {
                    topContributor: true,
                    mostInspiring: true,
                    trending: true, // ✅ hardkod dok ne stigne pravi podatak
                },
            };
        }

        return null;

    } catch (error) {
        console.error("Error fetching user:", error);
        throw new Error("Failed to fetch user");
    }
};