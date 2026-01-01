import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { serverTimestamp } from "firebase/firestore";

/**
 * Cuva post kao omiljeni za korisnika.
 *
 * - Dodaje dokument u subkolekciju `savedPosts` korisnika
 * - Upisuje vreme cuvanja preko `serverTimestamp()`
 *
 * @param {string} userId - ID korisnika
 * @param {string} postId - ID posta koji se cuva
 */

export const savePost = async (userId, postId, snapshot = {}) => {
    const ref = doc(db, "users", userId, "savedPosts", postId);

    await setDoc(ref, {
        savedAt: serverTimestamp(),
        ...snapshot
    });
};

/**
 * Uklanja post iz sacuvanih postova korisnika.
 *
 * - Brise dokument iz subkolekcije `savedPosts`
 *
 * @param {string} userId - ID korisnika
 * @param {string} postId - ID posta koji se uklanja
 */

export const unsavePost = async (userId, postId) => {
    const ref = doc(db, "users", userId, "savedPosts", postId);
    await deleteDoc(ref);
};