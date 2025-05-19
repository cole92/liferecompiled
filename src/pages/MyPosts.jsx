import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";

import Spinner from "../components/Spinner";
import { DEFAULT_PROFILE_PICTURE } from "../constants/defaults";
import { showErrorToast } from "../utils/toastUtils";
import PostsList from "../components/PostsList";
import EmptyState from "./dashboard/components/EmptyState";

// Dashboard komponenta za prikaz podataka korisnika
const MyPosts = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Funkcija za dohvatanje postova korisnika iz Firestore baze
    const fetchPosts = async () => {
      try {
        const postRef = collection(db, "posts");
        const q = query(
          postRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        // Uzimamo uvek najnovije korisnicke podatke iz AuthContext
        const author = {
          name: user.name || "Anonymous",
          profilePicture: user.profilePicture || DEFAULT_PROFILE_PICTURE,
        };

        // Mapiramo svaki dokument:
        // - Dodajemo author iz AuthContext (bez dodatnih poziva ka Firestore)
        // - Dodajemo fallback za comments ako nije definisan
        const userPosts = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            author,
            comments: data.comments || [], // default na prazan niz
          };
        });

        setPosts(userPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
        showErrorToast("Failed to load your posts. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.uid) {
      fetchPosts();
    }
  }, [user]);

  // Prikaz korisnickog interfejsa
  return (
    <div className="mb-6">
      {/* Pozdravna poruka i dugme za dodavanje posta */}
      <h2 className="text-2xl font-semibold mb-2">
        Welcome, {user ? user.email : "Guest"}
      </h2>
      <button
        onClick={() => navigate("/dashboard/create-post")}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        Create New Post
      </button>

      {/* Loading state */}
      {isLoading && <Spinner message="Loading your posts..." />}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <EmptyState message="You haven't created any posts yet." />
      )}
      {/* Prikaz liste postova korisnika */}
      {!isLoading && posts.length > 0 && <PostsList posts={posts} showDeleteButton={true} onDelete={null}/>}
    </div>
  );
};

export default MyPosts;
