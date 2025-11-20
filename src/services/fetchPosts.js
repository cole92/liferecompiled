import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  where,
} from "firebase/firestore";

/**
 * Dohvata sve aktivne postove iz Firestore baze, sortirane po datumu kreiranja (najnoviji prvi).
 *
 * - Ukljucuje samo postove koji nisu soft-obrisani (`deleted === false`)
 * - Za svaki post dodatno dohvata podatke o autoru iz 'users' kolekcije
 * - Ako nema komentara, koristi prazan niz kao fallback
 *
 * @async
 * @function getPosts
 * @returns {Promise<Array<Object>>} Lista postova sa informacijama o autoru.
 * Svaki post ukljucuje: `id`, `author`, ostala polja iz posta, i eventualno `comments`.
 * @throws {Error} Ako dodje do greske prilikom dohvatanja.
 */

export const getPosts = async () => {
  try {
    const postsRef = collection(db, "posts");
    const q = query(
      postsRef,
      where("deleted", "==", false), // Dohvatamo samo postove koji nisu oznaceni kao obrisani
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const posts = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const postData = docSnap.data();
        // Dohvata autora posta na osnovu userId

        const userRef = doc(db, "users", postData.userId); // Referenca na korisnika
        const userSnap = await getDoc(userRef); // Dohvati korisnika

        return {
          id: docSnap.id,
          ...postData,
          author: userSnap.exists()
            ? { ...userSnap.data(), id: userSnap.id }
            : { name: "Unknown", id: null },
          comments: postData.comments || [], // Ako nema komentara, stavljamo prazan niz
        };
      })
    );

    return posts;
  } catch (error) {
    console.log("Error fetching posts:", error);
    throw new Error("Failed to fetch posts.");
  }
};

/**
 * Dohvata jedan post iz Firestore baze na osnovu njegovog ID-ja.
 *
 * @async
 * @function getPostById
 * @param {string} postId - Jedinstveni ID posta koji se trazi.
 * @returns {Promise<Object|null>} Post objekat ako postoji, inače `null`.
 * @throws {Error} Ako dodje do greske prilikom dohvatanja.
 */

export const getPostById = async (postId) => {
  try {
    const ref = doc(db, "posts", postId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const post = { id: snap.id, ...snap.data() };

    return post;
  } catch (error) {
    console.log("Error fetching post:", error);
    throw new Error("Failed to fetch post.");
  }
};
