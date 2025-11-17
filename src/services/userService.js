// services/userService.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";

/** Fallback za obrisan/nepostojeći profil (UI-safe shape) */
const makeFallbackAuthor = () => ({
  id: null, // sentinel: nema profila → ne renderuj Link
  name: "Unknown author",
  profilePicture: DEFAULT_PROFILE_PICTURE,
  badges: {}, // ne prikazuj bedževe za Unknown autora
  deleted: true,
});

/** Normalizacija postojeceg profila */
const normalizeAuthor = (uid, data) => ({
  id: uid,
  name: data?.name || "Unknown author",
  profilePicture: data?.profilePicture || DEFAULT_PROFILE_PICTURE,
  deleted: false,
});

/**
 * Dohvata korisnika ili vraća fallback; nikad ne baca grešku, uvek vraća “safe” shape.
 */
export const getUserById = async (userId) => {
  try {
    if (!userId) return makeFallbackAuthor();
    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return makeFallbackAuthor();
    return normalizeAuthor(snap.id, snap.data());
  } catch (error) {
    console.error("Error fetching user:", error);
    return makeFallbackAuthor();
  }
};

/**
 * Obogaćuje post autorom. Autor je uvek postavljen (fallback kad ne postoji).
 */

/**
 * Enriches post with author.
 * Never throws: always returns a safe post+author shape (fallback on error).
 */
export const enrichPostWithAuthor = async (post) => {
  try {
    const author = await getUserById(post.userId);
    return {
      ...post,
      author,
    };
  } catch (error) {
    console.error("Author fetch failed in enrichPostWithAuthor:", error);
    return {
      ...post,
      author: makeFallbackAuthor(),
    };
  }
};
