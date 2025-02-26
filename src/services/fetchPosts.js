import { db } from "../firebase";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";

export const getPosts = async () => {
    try {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"));

        const querySnapshot = await getDocs(q);
        const posts = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
            const postData = docSnap.data();
            const userRef = doc(db, "users", postData.userId); // Referenca na korisnika
            const userSnap = await getDoc(userRef); // Dohvati korisnika

            return {
                id: docSnap.id,
                ...postData,
                author: userSnap.exists()
                    ? userSnap.data()
                    : { name: "Unknown" },
                comments: postData.comments || [], // Ako nema komentara, stavljamo prazan niz
            };
        }));

        return posts;

    } catch (error) {
        console.log("Error fetching posts:", error);
        throw new Error("Failed to fetch posts.");
    }
};
