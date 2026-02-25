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

import { normalizePostDoc } from "../mappers/posts/normalizePostDoc";

/**
 * Fetches all active posts from Firestore, sorted by creation date (newest first).
 *
 * Behavior:
 * - Includes only posts that are not soft-deleted (`deleted === false`)
 * - For each post, fetches the author data from the `users` collection
 * - Ensures `comments` is always an array (falls back to an empty array)
 *
 * Notes:
 * - This function performs 1 query for posts + 1 user fetch per post (N+1 reads).
 *   For large feeds, consider paging + batching author reads (or using a page service).
 *
 * @async
 * @function getPosts
 * @returns {Promise<Array<Object>>} List of posts including `id`, `author`, post fields, and `comments`.
 * @throws {Error} If fetching fails.
 */
export const getPosts = async () => {
  try {
    const postsRef = collection(db, "posts");

    const q = query(
      postsRef,
      where("deleted", "==", false), // Only active (not deleted) posts
      orderBy("createdAt", "desc"),
    );

    const querySnapshot = await getDocs(q);

    const posts = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const postData = docSnap.data();

        // Fetch the author based on userId
        const userRef = doc(db, "users", postData.userId);
        const userSnap = await getDoc(userRef);

        return {
          id: docSnap.id,
          ...postData,
          author: userSnap.exists()
            ? { ...userSnap.data(), id: userSnap.id }
            : { name: "Unknown", id: null },
          comments: postData.comments || [], // Ensure array fallback
        };
      }),
    );

    return posts;
  } catch (error) {
    console.log("Error fetching posts:", error);
    throw new Error("Failed to fetch posts.");
  }
};

/**
 * Fetches a single post from Firestore by its ID.
 *
 * @async
 * @function getPostById
 * @param {string} postId - Unique post ID.
 * @returns {Promise<Object|null>} The normalized post object if it exists, otherwise `null`.
 * @throws {Error} If fetching fails.
 */
export const getPostById = async (postId) => {
  try {
    const ref = doc(db, "posts", postId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    return normalizePostDoc(snap);
  } catch (error) {
    console.log("Error fetching post:", error);
    throw new Error("Failed to fetch post.");
  }
};
