import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Spinner from "../components/Spinner";
import EmptyState from "./dashboard/components/EmptyState";
import { useEffect } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import PostsList from "../components/PostsList";

// Dashboard komponenta za prikaz podataka korisnika
const MyPosts = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] =  useState(true);
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postRef = collection(db, "posts");

        const q = query(
          postRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const userPosts = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPosts(userPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (user?.uid) {
      fetchPost();
    }
  }, [user?.uid]);

  // Prikaz korisnickog interfejsa
  return (
    <div className="mb-6">
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
      {!isLoading && posts.length > 0 && <PostsList posts={posts} />}
    </div>
  );
};

export default MyPosts;
