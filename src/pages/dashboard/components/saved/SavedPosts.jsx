import { useContext, useEffect, useState } from "react";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";

import { AuthContext } from "../../../../context/AuthContext";
import { db } from "../../../../firebase";

import { enrichPostWithAuthor } from "../../../../services/userService";
import { showErrorToast } from "../../../../utils/toastUtils";

import SavedPostCard from "./SavedPostCard";
import EmptyState from "../EmptyState";
import Spinner from "../../../../components/Spinner";

/**
 * Lista sačuvanih postova korisnika (MVP fix):
 * - čita users/{uid}/savedPosts
 * - za svaki ID pokušava da učita posts/{id}
 * - SKIDA iz liste one koji ne mogu da se pročitaju (permission-denied / !exists)
 * - renderuje samo validne rezultate
 */
const SavedPosts = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const [savedPosts, setSavedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // CHANGE #1: ne pokrećemo fetch dok se auth ne završi
    if (isCheckingAuth) return;
    if (!user) return; // gost – nema čitanja

    const fetchSavedPosts = async () => {
      setIsLoading(true);
      try {
        // čitanje subkolekcije savedPosts samo za current user-a
        const savedRef = collection(db, "users", user.uid, "savedPosts");
        const savedSnap = await getDocs(savedRef);

        if (savedSnap.empty) {
          setSavedPosts([]);
          return;
        }

        // CHANGE #2: Promise.allSettled umesto Promise.all
        // - omogućava da se "problematične" stavke (npr. privatni/obrisani post)
        //   jednostavno preskoče umesto da padne cela lista
        const results = await Promise.allSettled(
          savedSnap.docs.map(async (docItem) => {
            // ostaje tvoja logika: doc id == postId
            const postRef = doc(db, "posts", docItem.id);
            const postSnap = await getDoc(postRef);

            // ako post ne postoji – tretiramo kao nevažeću referencu
            if (!postSnap.exists()) {
              throw new Error("missing-post");
            }

            const postData = { id: postSnap.id, ...postSnap.data() };

            // i dalje bogatimo autora; ako ovde pukne (npr. author rules) – biće "rejected"
            return await enrichPostWithAuthor(postData);
          })
        );

        // CHANGE #3: uzimamo samo uspešne rezultate
        const posts = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value);

        setSavedPosts(posts);
      } catch (error) {
        // ovo je top-level greška (npr. mreža); permission-denied po stavkama se ne diže ovde
        console.error("Error fetching saved posts (top-level):", error);
        showErrorToast("Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedPosts();
  }, [user, isCheckingAuth]);

  if (isCheckingAuth || isLoading) {
    return <Spinner message="Loading saved posts..." />;
  }

  if (!user) {
    return <p>Please log in to view saved posts.</p>;
  }

  if (savedPosts.length === 0) {
    return <EmptyState message="You haven't saved any posts yet." />;
  }

  return (
    <div>
      <h1>Saved Posts</h1>
      {savedPosts.map((post) => (
        <div key={post.id}>
          <SavedPostCard post={post} />
        </div>
      ))}
    </div>
  );
};

export default SavedPosts;
