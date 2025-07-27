import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../context/AuthContext";
import { db } from "../../../../firebase";
import { enrichPostWithAuthor } from "../../../../services/userService";
import SavedPostCard from "./SavedPostCard";
import Spinner from "../../../../components/Spinner";

import { doc, getDoc, getDocs, collection } from "firebase/firestore";

/**
 * @component SavedPosts
 *
 * Prikazuje sve sacuvane postove korisnika.
 *
 * - Dohvata listu ID-eva iz `savedPosts` subkolekcije
 * - Zatim dohvata podatke o svakom postu iz `posts` kolekcije
 * - Obogacuje svaki post sa podacima o autoru (koristi `enrichPostWithAuthor`)
 * - Prikazuje listu pomocu <SavedPostCard />
 *
 * @returns {JSX.Element}
 */
const SavedPosts = () => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const [savedPosts, setSavedPosts] = useState([]);

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!user) return;

      const savedRef = collection(db, "users", user.uid, "savedPosts");
      const savedSnap = await getDocs(savedRef);

      const posts = await Promise.all(
        savedSnap.docs.map(async (docItem) => {
          const postRef = doc(db, "posts", docItem.id);
          const postSnap = await getDoc(postRef);
          const postData = { id: postSnap.id, ...postSnap.data() };

          // Dodaje informacije o autoru
          return await enrichPostWithAuthor(postData);
        })
      );

      setSavedPosts(posts);
    };

    fetchSavedPosts();
  }, [user]);

  // Dok traje provera autentifikacije, prikazi spinner
  if (isCheckingAuth) return <Spinner message="Loading saved posts..." />;

  // Ako korisnik nije ulogovan
  if (!user) return <p>Please log in to view saved posts.</p>;

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
