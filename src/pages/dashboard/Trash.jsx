import { useContext, useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import { db } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";
import { DEFAULT_PROFILE_PICTURE } from "../../constants/defaults";
import { showErrorToast } from "../../utils/toastUtils";

import PostCard from "../../components/PostCard";
import Spinner from "../../components/Spinner";
import EmptyState from "./components/EmptyState";

const Trash = () => {
  const { user } = useContext(AuthContext);
  const [deletedPosts, setDeletedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  console.log(deletedPosts);

  useEffect(() => {
    const fetchDeletedPosts = async () => {
      try {
        const postRef = collection(db, "posts");
        const q = query(
          postRef,
          where("userId", "==", user.uid),
          where("deleted", "==", true),
          orderBy("createdAt", "desc")
        );
        const querrySnapShot = await getDocs(q);

        const author = {
          name: user.name || "Anonymous",
          profilePicture: user.profilePicture || DEFAULT_PROFILE_PICTURE,
        };

        const posts = querrySnapShot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            author,
            comments: data.comments || [],
          };
        });
        setDeletedPosts(posts);
      } catch (error) {
        console.error("Error fetching posts:", error);
        showErrorToast("Failed to load deleted posts. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    if (user?.uid) {
      fetchDeletedPosts();
    }
  }, [user]);

  return (
    <div>
      {/* Empty state */}
      {!isLoading && deletedPosts.length === 0 && (
        <EmptyState message="You haven't deleted any posts yet." />
      )}
      {/* Loading state */}
      {isLoading && <Spinner message="Loading deleted posts..." />}

      {!isLoading && deletedPosts.length > 0 && (
        <div className="grid gap-4">
          {deletedPosts.map((post) => (
            <PostCard key={post.id} post={post} isTrashMode={true}/>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trash;
