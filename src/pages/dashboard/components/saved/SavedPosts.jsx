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
 * Komponenta za prikaz svih sacuvanih postova korisnika.
 *
 * - Dohvata ID-eve iz podkolekcije `savedPosts` unutar korisnika
 * - Zatim dohvata pune podatke o svakom postu iz `posts` kolekcije
 * - Obogacuje svaki post sa podacima o autoru (`enrichPostWithAuthor`)
 * - Prikazuje postove pomocu <SavedPostCard />
 * - Prikazuje loading indikator, poruke o greskama i prazan prikaz ako nema postova
 *
 * @component
 * @returns {JSX.Element}
 */

const SavedPosts = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const [savedPosts, setSavedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!user) return;

      setIsLoading(true);

      try {
        const savedRef = collection(db, "users", user.uid, "savedPosts");
        const savedSnap = await getDocs(savedRef);

        const posts = await Promise.all(
          savedSnap.docs.map(async (docItem) => {
            const postRef = doc(db, "posts", docItem.id);
            const postSnap = await getDoc(postRef);
            const postData = { id: postSnap.id, ...postSnap.data() };

            return await enrichPostWithAuthor(postData);
          })
        );

        setSavedPosts(posts);
      } catch (error) {
        console.error("Error fetching saved posts:", error);
        showErrorToast("Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedPosts();
  }, [user]);

  if (isCheckingAuth || isLoading) {
    return <Spinner message="Loading saved posts..." />;
  }

  // Ako korisnik nije ulogovan
  if (!user) return <p>Please log in to view saved posts.</p>;

  // Ako su podaci u fazi dohvatanja
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
