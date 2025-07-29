import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Dohvata korisnicke podatke iz Firestore-a na osnovu user ID-ja.
 *
 * @async
 * @function getUserById
 * @param {string} userId - ID korisnika
 * @returns {Promise<object|null>} Podaci o korisniku ili null ako ne postoji
 */

export const getUserById = async (userId) => {
  try {
    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return {
        id: snap.id,
        ...snap.data(),
        badges: {
          topContributor: true,
          mostInspiring: true,
          trending: true, //Hardcodovanje privremeno dok ne stigne backend logika
        },
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw new Error("Failed to fetch user");
  }
};

/**
 * Obogacuje post dodavanjem podataka o autoru iz Firestore-a.
 *
 * @async
 * @function enrichPostWithAuthor
 * @param {object} post - Objekat posta koji sadrzi userId
 * @returns {Promise<object>} Post sa dodatim `author` objektom
 */
export const enrichPostWithAuthor = async (post) => {
  try {
    const authorRef = doc(db, "users", post.userId);
    const authorSnap = await getDoc(authorRef);

    if (!authorSnap.exists()) {
      return {
        ...post,
        author: null,
        badges: {
          mostInspiring: true,  // 🔥 TEST BADGES ZA POST
          trending: true,
        },
      };
    }

    const authorData = authorSnap.data();
    const author = {
      ...authorData,
      id: authorSnap.id,
      badges: {
        topContributor: true, // ✅ TEST BADGE ZA AUTORA
      },
    };

    return {
      ...post,
      author,
      badges: {
        mostInspiring: true,  // 🔥 TEST BADGES ZA POST
        trending: true,
      },
    };
  } catch (error) {
    console.error("Author fetch failed:", error);
    return {
      ...post,
      author: null,
      badges: {
        mostInspiring: true,
        trending: true,
      },
    };
  }
};