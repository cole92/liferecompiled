import { db } from "../firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

export const getPosts = async () => {
    try {
        // Pravljenje upita za kolekciju "posts"
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc")) // Sortiramo najnovije prve

        // Dohvatanje podataka
        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map((doc) => ({
            id: doc.id, // ID dokumenta
            ...doc.data(), // Ostali podaci iz firestora
        }));

        return posts // Vracamo niz postova

    } catch (error) {
        console.log("Error fetching posts:", error);
        throw new Error("Failed to fetch posts.");
        
    }
};